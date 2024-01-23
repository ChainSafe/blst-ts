import * as swig from "../../../src";
import napi from "../../../rebuild/lib";
import {PublicKey} from "../types";
import {BlsWorkRequest, ISignatureSet, SignatureSetType, VerifySignatureOpts} from "./types";
import {LinkedList} from "./array";
import {getAggregatePublicKey} from "./verify";

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

export function prepareSwigWorkReqFromJob(job: QueuedJob): BlsWorkRequest {
  if (job.type === QueuedJobType.default) {
    return {
      opts: job.opts,
      sets: job.sets.map((set) => {
        // this can throw, handled in the consumer code
        const publicKey = getAggregatePublicKey(set, true);
        return {
          sig: set.signature,
          msg: set.signingRoot,
          pk: publicKey.toBytes(),
        };
      }),
    };
  }

  const publicKey = swig.aggregatePubkeys(job.sets.map((set) => set.publicKey as swig.PublicKey));
  const signature = swig.aggregateSignatures(
    job.sets.map((set) => {
      const sig = swig.Signature.fromBytes(set.signature, swig.CoordType.affine);
      sig.sigValidate();
      return sig;
    })
  );

  return {
    opts: job.opts,
    sets: [
      {
        pk: publicKey.toBytes(),
        sig: signature.toBytes(),
        msg: job.message,
      },
    ],
  };
}

export function prepareNapiWorkReqFromJob(job: QueuedJob): BlsWorkRequest {
  if (job.type === QueuedJobType.default) {
    return {
      opts: job.opts,
      sets: job.sets.map((set) => {
        return {
          signature: set.signature,
          message: set.signingRoot,
          publicKey: getAggregatePublicKey(set, false),
        };
      }),
    };
  }

  const publicKey = napi.aggregatePublicKeys(job.sets.map((set) => set.publicKey as napi.PublicKey));
  const signature = napi.aggregateSignatures(
    job.sets.map((set) => {
      const sig = napi.Signature.deserialize(set.signature, napi.CoordType.affine);
      sig.sigValidate();
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
