import crypto from "crypto";
import * as swig from "../../../src";
import * as napi from "../../../rebuild/lib";
import {NapiSet, SerializedSet, SwigSet} from "../types";
import {getNapiSet, getSwigSet, shuffle} from "../helpers";
import {
  AggregatedSignatureSet,
  NapiAggregatedSignatureSet,
  NapiSameMessagePair,
  NapiSameMessageSet,
  NapiSignatureSetGroups,
  NapiSingleSignatureSet,
  SameMessageSetArray,
  SignatureSetType,
  SingleSignatureSet,
  SwigAggregatedSignatureSet,
  SwigSameMessagePair,
  SwigSameMessageSet,
  SwigSignatureSetGroups,
  SwigSingleSignatureSet,
  WorkResultError,
} from "./types";
import {QueuedJob, QueuedJobType} from "./queuedJob";

export function countSignatures(job: QueuedJob): number {
  switch (job.type) {
    case QueuedJobType.default:
      return job.sets.length;
    case QueuedJobType.sameMessage:
      return 1;
  }
}

export function chunkifyMaximizeChunkSize<T>(arr: T[], minPerChunk: number): T[][] {
  const chunkCount = Math.floor(arr.length / minPerChunk);
  if (chunkCount <= 1) {
    return [arr];
  }

  // Prefer less chunks of bigger size
  const perChunk = Math.ceil(arr.length / chunkCount);
  const arrArr: T[][] = [];

  for (let i = 0; i < arr.length; i += perChunk) {
    arrArr.push(arr.slice(i, i + perChunk));
  }

  return arrArr;
}

export function getJobResultError(jobResult: WorkResultError | null, i: number): Error {
  const workerError = jobResult ? Error(jobResult.error.message) : Error(`No jobResult for index ${i}`);
  if (jobResult?.error?.stack) workerError.stack = jobResult.error.stack;
  return workerError;
}

const commonMessage = crypto.randomBytes(32);

const commonNapiMessageSignatures = new Map<number, napi.Signature>();
export function getNapiSetSameMessage(i: number): NapiSet {
  const set = getNapiSet(i);
  let signature = commonNapiMessageSignatures.get(i);
  if (!signature) {
    signature = set.secretKey.sign(commonMessage);
    commonNapiMessageSignatures.set(i, signature);
  }
  return {
    message: commonMessage,
    secretKey: set.secretKey,
    publicKey: set.publicKey,
    signature,
  };
}

const commonSwigMessageSignatures = new Map<number, swig.Signature>();
export function getSwigSetSameMessage(i: number): SwigSet {
  const set = getSwigSet(i);
  let signature = commonSwigMessageSignatures.get(i);
  if (!signature) {
    signature = set.sk.sign(commonMessage);
    commonSwigMessageSignatures.set(i, signature);
  }
  return {
    msg: commonMessage,
    sk: set.sk,
    pk: set.pk,
    sig: signature,
  };
}

const serializedSets = new Map<number, SerializedSet>();
export function getSerializedSet(i: number): SerializedSet {
  const set = serializedSets.get(i);
  if (set) {
    return set;
  }
  const deserialized = getNapiSet(i);
  const serialized = {
    message: deserialized.message,
    secretKey: deserialized.secretKey.serialize(),
    publicKey: deserialized.publicKey.serialize(),
    signature: deserialized.signature.serialize(),
  };
  serializedSets.set(i, serialized);
  return serialized;
}

export const keygenMaterial = crypto.randomBytes(32);

/**
 * Gets batches of signature sets.
 *
 * @param isSwig - true for swig, false for napi
 * @param batchSize - number of sets to generate
 */
export function getBatchesOfSingleSignatureSets<
  T extends boolean,
  R extends SingleSignatureSet[] = T extends true ? SwigSingleSignatureSet[] : NapiSingleSignatureSet[],
>(isSwig: T, batchSize: number): R {
  const sets = [] as unknown as R;

  for (let i = 0; i < batchSize; i++) {
    if (isSwig) {
      const set = getSwigSet(i);
      sets.push({
        type: SignatureSetType.single,
        pubkey: set.pk,
        signingRoot: set.msg,
        signature: set.sig.toBytes(),
      });
    } else {
      const set = getNapiSet(i);
      sets.push({
        type: SignatureSetType.single,
        pubkey: set.publicKey,
        signingRoot: set.message,
        signature: set.signature.serialize(),
      });
    }
  }

  return sets;
}

/**
 * Gets groups of batches of signature sets
 *
 * @param isSwig - true for swig, false for napi
 * @param batchSize - number of sets in each group, each with a single signature and message
 * @param numGroups - number of groups to generate
 * @returns
 */
export function getGroupsOfBatchesOfSingleSignatureSets<T extends boolean>(
  isSwig: T,
  batchSize: number,
  numGroups: number
): SingleSignatureSet[][] {
  const groups = [] as SingleSignatureSet[][];
  for (let i = 0; i < numGroups; i++) {
    groups.push(getBatchesOfSingleSignatureSets(isSwig, batchSize));
  }
  return groups;
}

/**
 * Gets batches of signature sets where the signature is aggregated from
 * multiple public keys signing the same message.
 *
 * @param isSwig - true for swig, false for napi
 * @param setCount - number of public key/signature pairs
 * @param batchSize - number of sets to generate
 */
export function getBatchesOfSameMessageSignatureSets<
  T extends boolean,
  R extends SameMessageSetArray = T extends true ? SwigSameMessageSet[] : NapiSameMessageSet[],
>(isSwig: T, setCount: number, batchSize: number): R {
  const aggregatedSets = [] as unknown as R;
  for (let i = 0; i < batchSize; i++) {
    let message: Uint8Array;
    const sets = [] as (NapiSameMessagePair | SwigSameMessagePair)[];
    for (let j = 0; j < setCount; j++) {
      if (isSwig) {
        const set = getSwigSetSameMessage(i + j);
        if (j === 0) {
          message = set.msg;
        }
        sets.push({publicKey: set.pk, signature: set.sig});
      } else {
        const set = getNapiSetSameMessage(i + j);
        if (j === 0) {
          message = set.message;
        }
        sets.push({publicKey: set.publicKey, signature: set.signature});
      }
    }

    aggregatedSets.push({
      sets: sets as any,
      message: message!,
    });
  }
  return aggregatedSets;
}

/**
 * Gets batches of signature sets where the signature is aggregated from
 * multiple public keys signing the same message.
 *
 * @param isSwig - true for swig, false for napi
 * @param pubKeyCount - number of public key/signature pairs to aggregate
 * @param batchSize - number of sets to generate
 */
export function getBatchesOfAggregatedSignatureSets<
  T extends boolean,
  R extends AggregatedSignatureSet[] = T extends true ? SwigAggregatedSignatureSet[] : NapiAggregatedSignatureSet[],
>(isSwig: T, pubKeyCount: number, batchSize: number): R {
  const aggregatedSets = [] as unknown as R;
  const sameMessageSets = getBatchesOfSameMessageSignatureSets(isSwig, pubKeyCount, batchSize);
  for (const {sets, message} of sameMessageSets) {
    const sigs = sets.map((set) => set.signature);
    const signature = isSwig
      ? swig.aggregateSignatures(sigs as swig.Signature[]).toBytes()
      : napi.aggregateSignatures(sigs as napi.Signature[]).serialize();

    aggregatedSets.push({
      type: SignatureSetType.aggregate,
      pubkeys: sets.map((set) => set.publicKey) as any,
      signingRoot: message,
      signature,
    });
  }
  return aggregatedSets;
}

/**
 * Gets groups of batches of sets where the signature is aggregated from
 * multiple public keys signing the same message.
 *
 * @param isSwig - true for swig, false for napi
 * @param pubKeyCount - number of public key/signature pairs to aggregate
 * @param batchSize - number of sets in each group, each with a single signature and message
 * @param numGroups - number of groups to generate
 * @returns
 */
export function getGroupsOfBatchesOfAggregatedSignatureSets<T extends boolean>(
  isSwig: T,
  pubKeyCount: number,
  batchSize: number,
  numGroups: number
): AggregatedSignatureSet[][] {
  const groups = [] as AggregatedSignatureSet[][];
  for (let i = 0; i < numGroups; i++) {
    groups.push(getBatchesOfAggregatedSignatureSets(isSwig, pubKeyCount, batchSize));
  }
  return groups;
}

/**
 * Gets groups of batches of signature sets. Gets both single and aggregated and
 * shuffles them together as would be expected in a real-world scenario.
 *
 * @param isSwig - true for swig, false for napi
 * @param pubKeyCount - number of public key/signature pairs in a batch
 * @param batchSize - number of batches in each group
 * @param singleGroupsCount - number of groups of single signature sets
 * @param aggregatedGroupsCount - number of groups of aggregated signature sets
 * @returns
 */
export function getGroupsOfBatchesOfSignatureSets<T extends boolean>(
  isSwig: T,
  pubKeyCount: number,
  batchSize: number,
  singleGroupsCount: number,
  aggregatedGroupsCount: number
): T extends true ? SwigSignatureSetGroups : NapiSignatureSetGroups {
  const single = getGroupsOfBatchesOfSingleSignatureSets(isSwig, batchSize, singleGroupsCount);
  const aggregated = getGroupsOfBatchesOfAggregatedSignatureSets(isSwig, pubKeyCount, batchSize, aggregatedGroupsCount);
  return shuffle([...single, ...aggregated]) as T extends true ? SwigSignatureSetGroups : NapiSignatureSetGroups;
}
