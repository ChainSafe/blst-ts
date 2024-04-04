import {CoordType, PublicKey, Signature, aggregatePublicKeys, aggregateSignatures} from "../../../rebuild/lib";
import {BlsWorkRequest, ISignatureSet, SignatureSetType, VerifySignatureOpts} from "./types";
import {LinkedList} from "./array";
import {getAggregatePublicKey} from "./verify";
import {randomBytesNonZero} from "./helpers";

export enum QueuedJobType {
  default = "default",
  sameMessage = "same_message",
}

export type QueuedJobDefault = {
  type: QueuedJobType.default;
  resolve: (result: boolean) => void;
  reject: (error?: Error) => void;
  addedTimeMs: number;
  opts: VerifySignatureOpts;
  sets: ISignatureSet[];
};

export type QueuedJobSameMessage = {
  type: QueuedJobType.sameMessage;
  resolve: (result: boolean[]) => void;
  reject: (error?: Error) => void;
  addedTimeMs: number;
  opts: VerifySignatureOpts;
  sets: {publicKey: PublicKey; signature: Uint8Array}[];
  message: Uint8Array;
};

export type QueuedJob = QueuedJobDefault | QueuedJobSameMessage;

export function prepareWorkReqFromJob(job: QueuedJob): BlsWorkRequest {
  if (job.type === QueuedJobType.default) {
    return {
      opts: job.opts,
      sets: job.sets.map((set) => {
        return {
          signature: set.signature,
          message: set.signingRoot,
          publicKey: getAggregatePublicKey(set),
        };
      }),
    };
  }

  const randomness: Uint8Array[] = [];
  if (job.opts.addVerificationRandomness) {
    for (let i = 0; i < job.sets.length; i++) {
      randomness.push(randomBytesNonZero(8));
    }
  }

  const publicKey = aggregatePublicKeys(
    job.sets.map((set, i) => {
      if (job.opts.addVerificationRandomness) {
        return (set.publicKey as PublicKey).multiplyBy(randomness[i]);
      }
      return set.publicKey as PublicKey;
    })
  );
  const signature = aggregateSignatures(
    job.sets.map((set, i) => {
      const sig = Signature.deserialize(set.signature, CoordType.affine);
      sig.sigValidate();
      if (job.opts.addVerificationRandomness) {
        return sig.multiplyBy(randomness[i]);
      }
      return sig;
    })
  );

  return {
    opts: job.opts,
    sets: [
      {
        publicKey,
        signature,
        message: job.message,
      },
    ],
  };
}

export function jobItemSameMessageToMultiSet(job: QueuedJobSameMessage): LinkedList<QueuedJobDefault> {
  const promises: Promise<boolean>[] = [];
  const jobs = new LinkedList<QueuedJobDefault>();

  for (const set of job.sets) {
    promises.push(
      new Promise<boolean>((resolve, reject) => {
        jobs.push({
          type: QueuedJobType.default,
          resolve,
          reject,
          addedTimeMs: job.addedTimeMs,
          opts: {batchable: false, priority: job.opts.priority},
          sets: [
            {
              type: SignatureSetType.single,
              pubkey: set.publicKey,
              signature: set.signature,
              signingRoot: job.message,
            },
          ],
        });
      })
    );
  }

  // Connect jobs to main job
  Promise.all(promises).then(job.resolve, job.reject);

  return jobs;
}
