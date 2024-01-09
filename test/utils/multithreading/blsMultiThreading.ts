/* eslint-disable no-console */

/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import {spawn, Worker} from "@chainsafe/threads";
// `threads` library creates self global variable which breaks `timeout-abort-controller` https://github.com/jacobheun/timeout-abort-controller/issues/9
// Don't add an eslint disable here as a reminder that this has to be fixed eventually
// eslint-disable-next-line
// @ts-ignore
// eslint-disable-next-line
self = undefined;

import {PublicKey} from "../types";
import {
  BlsMultiThreadWorkerPoolOptions,
  BlsPoolType,
  BlsWorkRequest,
  VerifySignatureOpts,
  WorkResultCode,
  WorkerApi,
  WorkerData,
  WorkerDescriptor,
  WorkerStatusCode,
  WorkRequestHandler,
  ISignatureSet,
} from "./types";
import {LinkedList} from "./array";
import {
  prepareSwigWorkReqFromJob,
  prepareNapiWorkReqFromJob,
  QueuedJob,
  QueuedJobType,
  QueuedJobSameMessage,
  jobItemSameMessageToMultiSet,
} from "./queuedJob";
import {defaultPoolSize} from "./poolSize";
import {runNapiWorkRequests} from "./runWorkRequests";
import {chunkifyMaximizeChunkSize, countSignatures, getJobResultError} from "./helpers";
import {verifySignatureSets} from "./verify";

const MAX_SIGNATURE_SETS_PER_JOB = 128;
const MAX_BUFFERED_SIGS = 32;
const MAX_BUFFER_WAIT_MS = 100;
const MAX_JOBS_CAN_ACCEPT_WORK = 512;

export class BlsMultiThreading {
  readonly blsPoolSize: number;

  private readonly blsVerifyAllInQueue: boolean;
  private readonly blsPoolType: BlsPoolType;
  private readonly workers: WorkerDescriptor[] = [];

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
    this.blsVerifyAllInQueue = options.blsVerifyAllInQueue ?? false;
    this.blsPoolType = options.blsPoolType ?? BlsPoolType.workers;

    if (this.blsPoolType === BlsPoolType.workers) {
      this.blsPoolSize = Math.max(defaultPoolSize - 1, 1);
      this.workers = this.createWorkers(this.blsPoolSize);
    } else {
      const uvThreadPoolSize = Number(process.env.UV_THREADPOOL_SIZE);
      this.blsPoolSize = isNaN(uvThreadPoolSize) ? 4 : uvThreadPoolSize;
    }
  }

  canAcceptWork(): boolean {
    return this.workersBusy < this.blsPoolSize && this.jobsForNextRun.length < MAX_JOBS_CAN_ACCEPT_WORK;
  }

  async verifySignatureSets(sets: ISignatureSet[], opts: VerifySignatureOpts = {}): Promise<boolean> {
    if (opts.verifyOnMainThread && !this.blsVerifyAllInQueue) {
      return verifySignatureSets(sets, this.blsPoolType === BlsPoolType.workers);
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
              opts,
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

    if (this.blsPoolType === BlsPoolType.workers) {
      // Terminate all workers. await to ensure no workers are left hanging
      await Promise.all(
        Array.from(this.workers.entries()).map(([id, worker]) =>
          // NOTE: 'threads' has not yet updated types, and NodeJS complains with
          // [DEP0132] DeprecationWarning: Passing a callback to worker.terminate() is deprecated. It returns a Promise instead.
          (worker.worker.terminate() as unknown as Promise<void>).catch((e: Error) => {
            console.error("Error terminating worker", {id}, e);
          })
        )
      );
    }
  }

  async waitTillInitialized(): Promise<void> {
    await Promise.all(
      this.workers.map(async (worker) => {
        if (worker.status.code === WorkerStatusCode.initializing) {
          await worker.status.initPromise;
        }
      })
    );
  }

  private createWorkers(poolSize: number): WorkerDescriptor[] {
    const workers: WorkerDescriptor[] = [];

    for (let i = 0; i < poolSize; i++) {
      const workerData: WorkerData = {workerId: i};
      const worker = new Worker("worker.js", {
        workerData,
      } as ConstructorParameters<typeof Worker>[1]);

      const workerDescriptor: WorkerDescriptor = {
        worker,
        status: {code: WorkerStatusCode.notInitialized},
      };
      workers.push(workerDescriptor);

      // TODO: Consider initializing only when necessary
      const initPromise = spawn<WorkerApi>(worker, {
        // A Lodestar Node may do very expensive task at start blocking the event loop and causing
        // the initialization to timeout. The number below is big enough to almost disable the timeout
        timeout: 5 * 60 * 1000,
      });

      workerDescriptor.status = {code: WorkerStatusCode.initializing, initPromise};

      initPromise
        .then((workerApi) => {
          workerDescriptor.status = {code: WorkerStatusCode.idle, workerApi};
          // Potentially run jobs that were queued before initialization of the first worker
          setTimeout(this.runJob, 0);
        })
        .catch((error: Error) => {
          workerDescriptor.status = {code: WorkerStatusCode.initializationError, error};
        });
    }

    return workers;
  }

  private queueWork(job: QueuedJob): void {
    if (this.closed) {
      throw new Error("QUEUE_ABORTED");
    }

    if (this.blsPoolType === BlsPoolType.workers) {
      if (
        this.workers.length > 0 &&
        this.workers[0].status.code === WorkerStatusCode.initializationError &&
        this.workers.every((worker) => worker.status.code === WorkerStatusCode.initializationError)
      ) {
        return job.reject(this.workers[0].status.error);
      }
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
      setTimeout(this.runJob, 0);
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

    if (this.blsPoolType === BlsPoolType.workers) {
      await this.runJobWorkerPool(prepared);
    } else {
      await this.runJobLibuv(prepared);
    }

    setTimeout(this.runJob, 0);
  };

  private runJobLibuv = async (jobs: QueuedJob[]): Promise<void> => {
    await this._runJob(jobs, runNapiWorkRequests);
  };

  private runJobWorkerPool = async (jobs: QueuedJob[]): Promise<void> => {
    const worker = this.workers.find((worker) => worker.status.code === WorkerStatusCode.idle);
    if (!worker || worker.status.code !== WorkerStatusCode.idle) {
      return;
    }

    const workerApi = worker.status.workerApi;
    worker.status = {code: WorkerStatusCode.running, workerApi};
    this.workersBusy++;

    await this._runJob(jobs, workerApi.runWorkRequests);

    worker.status = {code: WorkerStatusCode.idle, workerApi};
    this.workersBusy--;
  };

  private _runJob = async (jobs: QueuedJob[], runWorkRequests: WorkRequestHandler): Promise<void> => {
    try {
      const workReqs: BlsWorkRequest[] = [];
      const jobsStarted: QueuedJob[] = [];

      for (const job of jobs) {
        let workReq: BlsWorkRequest;
        try {
          workReq =
            this.blsPoolType === BlsPoolType.workers ? prepareSwigWorkReqFromJob(job) : prepareNapiWorkReqFromJob(job);
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
