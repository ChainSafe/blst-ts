import crypto from "crypto";
import * as swig from "../../../src";
import * as napi from "../../../rebuild/lib";
import {NapiSet, SerializedSet, SwigSet} from "../types";
import {getNapiSet, getSwigSet, buildNapiSet, shuffle} from "../helpers";
import {
  AggregatedSignatureSet,
  NapiAggregatedSignatureSet,
  NapiSignatureSetGroups,
  SignatureSetType,
  SingleSignatureSet,
  SwigAggregatedSignatureSet,
  SwigSignatureSetGroups,
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
  set.message = commonMessage;
  const signature = commonNapiMessageSignatures.get(i);
  if (signature) {
    set.signature = signature;
  } else {
    set.signature = set.secretKey.sign(commonMessage);
    commonNapiMessageSignatures.set(i, set.signature);
  }
  return set;
}

const commonSwigMessageSignatures = new Map<number, swig.Signature>();
export function getSwigSetSameMessage(i: number): SwigSet {
  const set = getSwigSet(i);
  set.msg = commonMessage;
  const signature = commonSwigMessageSignatures.get(i);
  if (signature) {
    set.sig = signature;
  } else {
    set.sig = set.sk.sign(commonMessage);
    commonSwigMessageSignatures.set(i, set.sig);
  }
  return set;
}

const serializedSets = new Map<number, SerializedSet>();
export function getSerializedSet(i: number): SerializedSet {
  const set = serializedSets.get(i);
  if (set) {
    return set;
  }
  const deserialized = buildNapiSet(i);
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

export function getAggregatedSignatureSets<
  T extends boolean,
  R extends AggregatedSignatureSet[] = T extends true ? SwigAggregatedSignatureSet[] : NapiAggregatedSignatureSet[],
>(count: number, pubKeyCount: number, isSwig: T): R {
  const sets = [] as unknown as R;
  for (let i = 0; i < count; i++) {
    const aggregated = [] as (SwigSet | NapiSet)[];
    for (let j = 0; j < pubKeyCount; j++) {
      const set = isSwig ? getSwigSet(i + j) : getNapiSet(i + j);
      aggregated.push(set);
    }

    const sigs = aggregated.map((set) => (isSwig ? (set as SwigSet).sig : (set as NapiSet).signature));
    const signature = isSwig
      ? swig.aggregateSignatures(sigs as swig.Signature[]).toBytes()
      : napi.aggregateSignatures(sigs as napi.Signature[]).serialize();

    sets.push({
      type: SignatureSetType.aggregate,
      pubkeys: aggregated.map((set) => (isSwig ? (set as SwigSet).pk : (set as NapiSet).publicKey)) as any,
      signingRoot: commonMessage,
      signature,
    });
  }
  return sets;
}

export function getGroupsOfAggregatedSignatureSets<T extends boolean>(
  numGroups: number,
  count: number,
  pubKeyCount: number,
  isSwig: T
): AggregatedSignatureSet[][] {
  const groups = [] as AggregatedSignatureSet[][];
  for (let i = 0; i < numGroups; i++) {
    groups.push(getAggregatedSignatureSets(count, pubKeyCount, isSwig));
  }
  return groups;
}

export function getSingleSignatureSets<T extends boolean>(count: number, isSwig: T): SingleSignatureSet[] {
  const sets = [] as SingleSignatureSet[];

  for (let i = 0; i < count; i++) {
    const set = isSwig ? getSwigSet(i) : getNapiSet(i);
    sets.push({
      type: SignatureSetType.single,
      pubkey: isSwig ? (set as SwigSet).pk : (set as NapiSet).publicKey,
      signingRoot: commonMessage,
      signature: isSwig ? (set as SwigSet).sig.toBytes() : (set as NapiSet).signature.serialize(),
    });
  }

  return sets;
}

export function getGroupsOfSingleSignatureSets<T extends boolean>(
  numGroups: number,
  count: number,
  isSwig: T
): SingleSignatureSet[][] {
  const groups = [] as SingleSignatureSet[][];
  for (let i = 0; i < numGroups; i++) {
    groups.push(getSingleSignatureSets(count, isSwig));
  }
  return groups;
}

export function getGroupsOfSignatureSets<T extends boolean>(
  isSwig: T,
  countPerGroup: number,
  singleGroups: number,
  aggregatedGroups: number,
  pubKeyCount: number
): T extends true ? SwigSignatureSetGroups : NapiSignatureSetGroups {
  const single = getGroupsOfSingleSignatureSets(singleGroups, countPerGroup, isSwig);
  const aggregated = getGroupsOfAggregatedSignatureSets(aggregatedGroups, countPerGroup, pubKeyCount, isSwig);
  return shuffle([...single, ...aggregated]) as T extends true ? SwigSignatureSetGroups : NapiSignatureSetGroups;
}
