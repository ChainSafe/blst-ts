import {PublicKey} from "../../../rebuild/lib";
import {chunkifyMaximizeChunkSize} from "../../utils";
import {
  BlsMultiThreadWorkerPoolOptions,
  BlsWorkRequest,
  VerifySignatureOpts,
  WorkResultCode,
  ISignatureSet,
} from "./types";
import {LinkedList} from "./array";
import {
  prepareWorkReqFromJob,
  QueuedJob,
  QueuedJobType,
  QueuedJobSameMessage,
  jobItemSameMessageToMultiSet,
} from "./queuedJob";
import {runWorkRequests} from "./runWorkRequests";
import {countSignatures, getJobResultError} from "./helpers";
import {verifySignatureSets} from "./verify";

const MAX_SIGNATURE_SETS_PER_JOB = 128;
const MAX_BUFFERED_SIGS = 32;
const MAX_BUFFER_WAIT_MS = 100;
const MAX_JOBS_CAN_ACCEPT_WORK = 512;

export class BlsMultiThreading {
  readonly blsPoolSize: number;

  private readonly addVerificationRandomness: boolean;
  private readonly blsVerifyAllInQueue: boolean;

  private readonly jobsForNextRun = new LinkedList<QueuedJob>();
  private buffer: {
    jobs: LinkedList<QueuedJob>;
    prioritizedJobs: LinkedList<QueuedJob>;
    sigCount: number;
    firstPush: number;
    timeout: NodeJS.Timeout;
  } | null = null;

  private closed = false;
  private workersBusy = 0;

  constructor(options: BlsMultiThreadWorkerPoolOptions /*, modules: BlsMultiThreadWorkerPoolModules */) {
    this.addVerificationRandomness = options.addVerificationRandomness ?? false;
    this.blsVerifyAllInQueue = options.blsVerifyAllInQueue ?? false;
    const uvThreadPoolSize = Number(process.env.UV_THREADPOOL_SIZE);
    this.blsPoolSize = isNaN(uvThreadPoolSize) ? 4 : uvThreadPoolSize;
  }

  canAcceptWork(): boolean {
    return this.workersBusy < this.blsPoolSize && this.jobsForNextRun.length < MAX_JOBS_CAN_ACCEPT_WORK;
  }

  async verifySignatureSets(sets: ISignatureSet[], opts: VerifySignatureOpts = {}): Promise<boolean> {
    if (opts.verifyOnMainThread && !this.blsVerifyAllInQueue) {
      return verifySignatureSets(sets);
    }

    const results = await Promise.all(
      chunkifyMaximizeChunkSize(sets, MAX_SIGNATURE_SETS_PER_JOB).map(
        (setsChunk) =>
          new Promise<boolean>((resolve, reject) => {
            return this.queueWork({
              type: QueuedJobType.default,
              resolve,
              reject,
              addedTimeMs: Date.now(),
              opts,
              sets: setsChunk,
            });
          })
      )
    );

    // .every on an empty array returns true
    if (results.length === 0) {
      throw Error("Empty results array");
    }

    return results.every((isValid) => isValid === true);
  }

  async verifySignatureSetsSameMessage(
    sets: {publicKey: PublicKey; signature: Uint8Array}[],
    message: Uint8Array,
    opts: Omit<VerifySignatureOpts, "verifyOnMainThread"> = {}
  ): Promise<boolean[]> {
    const results = await Promise.all(
      chunkifyMaximizeChunkSize(sets, MAX_SIGNATURE_SETS_PER_JOB).map(
        (setsChunk) =>
          new Promise<boolean[]>((resolve, reject) => {
            this.queueWork({
              type: QueuedJobType.sameMessage,
              resolve,
              reject,
              addedTimeMs: Date.now(),
              opts: {...opts, addVerificationRandomness: this.addVerificationRandomness},
              sets: setsChunk,
              message,
            });
          })
      )
    );

    return results.flat();
  }

  async close(): Promise<void> {
    if (this.buffer) {
      clearTimeout(this.buffer.timeout);
    }

    // Abort all jobs
    for (const job of this.jobsForNextRun) {
      job.reject(new Error("QUEUE_ABORTED"));
    }
    this.jobsForNextRun.clear();

    // TODO: (matthewkeil) make sure clearing jobs doesn't cause issue when libuv is used
    //       and the jobs resolve/reject again at task completion
  }

  private queueWork(job: QueuedJob): void {
    if (this.closed) {
      throw new Error("QUEUE_ABORTED");
    }

    if (job.opts.batchable) {
      if (!this.buffer) {
        this.buffer = {
          jobs: new LinkedList(),
          prioritizedJobs: new LinkedList(),
          sigCount: 0,
          firstPush: Date.now(),
          timeout: setTimeout(this.runBufferedJobs, MAX_BUFFER_WAIT_MS),
        };
      }

      job.opts.priority ? this.buffer.prioritizedJobs.push(job) : this.buffer.jobs.push(job);
      this.buffer.sigCount += countSignatures(job);

      if (this.buffer.sigCount > MAX_BUFFERED_SIGS) {
        clearTimeout(this.buffer.timeout);
        this.runBufferedJobs();
      }
    } else {
      if (job.opts.priority) {
        this.jobsForNextRun.unshift(job);
      } else {
        this.jobsForNextRun.push(job);
      }
      setTimeout(this.runJob, 0);
    }
  }

  private prepareWork(): QueuedJob[] {
    const jobs: QueuedJob[] = [];
    let totalSigs = 0;

    while (totalSigs < MAX_SIGNATURE_SETS_PER_JOB) {
      const job = this.jobsForNextRun.shift();
      if (!job) {
        // TODO: (matthewkeil) should this pull from buffer.prioritizedJobs and
        //       then buffer.jobs until full run?
        break;
      }

      jobs.push(job);
      totalSigs += countSignatures(job);
    }

    return jobs;
  }

  private runBufferedJobs = (): void => {
    if (this.buffer) {
      for (const job of this.buffer.jobs) {
        this.jobsForNextRun.push(job);
      }
      for (const job of this.buffer.prioritizedJobs) {
        this.jobsForNextRun.unshift(job);
      }
      this.buffer = null;
      setTimeout(this.runJob.bind(this), 0);
    }
  };

  private runJob = async (): Promise<void> => {
    if (this.closed) {
      return;
    }
    const prepared = this.prepareWork();
    if (prepared.length === 0) {
      return;
    }

    await this._runJob(prepared);

    setTimeout(this.runJob, 0);
  };

  private _runJob = async (jobs: QueuedJob[]): Promise<void> => {
    try {
      const workReqs: BlsWorkRequest[] = [];
      const jobsStarted: QueuedJob[] = [];

      for (const job of jobs) {
        let workReq: BlsWorkRequest;
        try {
          workReq = prepareWorkReqFromJob(job);
        } catch (e) {
          switch (job.type) {
            case QueuedJobType.default:
              job.reject(e as Error);
              break;

            case QueuedJobType.sameMessage:
              this.retryJobItemSameMessage(job);
              break;
          }

          continue;
        }
        workReqs.push(workReq);
        jobsStarted.push(job);
      }

      const workResult = await runWorkRequests(workReqs);
      const {results} = workResult;

      for (let i = 0; i < jobsStarted.length; i++) {
        const job = jobsStarted[i];
        const jobResult = results[i];

        switch (job.type) {
          case QueuedJobType.default:
            if (!jobResult || jobResult.code !== WorkResultCode.success) {
              job.reject(getJobResultError(jobResult, i));
            } else {
              job.resolve(jobResult.result);
            }
            break;

          case QueuedJobType.sameMessage:
            if (!jobResult || jobResult.code !== WorkResultCode.success) {
              job.reject(getJobResultError(jobResult, i));
            } else {
              if (jobResult.result) {
                job.resolve(job.sets.map(() => true));
              } else {
                this.retryJobItemSameMessage(job);
              }
            }
            break;
        }
      }
    } catch (e) {
      for (const job of jobs) {
        job.reject(e as Error);
      }
    }
  };

  private retryJobItemSameMessage(job: QueuedJobSameMessage): void {
    for (const j of jobItemSameMessageToMultiSet(job)) {
      if (j.opts.priority) {
        this.jobsForNextRun.unshift(j);
      } else {
        this.jobsForNextRun.push(j);
      }
    }
  }
}
