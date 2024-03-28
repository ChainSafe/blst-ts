import crypto from "crypto";
import {aggregateSignatures} from "../../../lib";
import {getTestSet, getTestSetSameMessage} from "../testSets";
import {shuffle} from "../helpers";
import {
  AggregatedSignatureSet,
  SameMessagePair,
  SignatureSetGroups,
  SingleSignatureSet,
  SameMessageSetArray,
  SignatureSetType,
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

export function getJobResultError(jobResult: WorkResultError | null, i: number): Error {
  const workerError = jobResult ? Error(jobResult.error.message) : Error(`No jobResult for index ${i}`);
  if (jobResult?.error?.stack) workerError.stack = jobResult.error.stack;
  return workerError;
}

export const keygenMaterial = crypto.randomBytes(32);

/**
 * Gets batches of signature sets.
 *
 * @param batchSize - number of sets to generate
 */
export function getBatchesOfSingleSignatureSets(batchSize: number): SingleSignatureSet[] {
  const sets: SingleSignatureSet[] = [];

  for (let i = 0; i < batchSize; i++) {
    const set = getTestSet(i);
    sets.push({
      type: SignatureSetType.single,
      pubkey: set.publicKey,
      signingRoot: set.message,
      signature: set.signature.serialize(),
    });
  }

  return sets;
}

/**
 * Gets groups of batches of signature sets
 *
 * @param batchSize - number of sets in each group, each with a single signature and message
 * @param numGroups - number of groups to generate
 * @returns
 */
export function getGroupsOfBatchesOfSingleSignatureSets(batchSize: number, numGroups: number): SingleSignatureSet[][] {
  const groups = [] as SingleSignatureSet[][];
  for (let i = 0; i < numGroups; i++) {
    groups.push(getBatchesOfSingleSignatureSets(batchSize));
  }
  return groups;
}

/**
 * Gets batches of signature sets where the signature is aggregated from
 * multiple public keys signing the same message.
 *
 * @param setCount - number of public key/signature pairs
 * @param batchSize - number of sets to generate
 */
export function getBatchesOfSameMessageSignatureSets(setCount: number, batchSize: number): SameMessageSetArray {
  const aggregatedSets: SameMessageSetArray = [];
  for (let i = 0; i < batchSize; i++) {
    let message: Uint8Array;
    const sets: SameMessagePair[] = [];
    for (let j = 0; j < setCount; j++) {
      const set = getTestSetSameMessage(i + j);
      if (j === 0) {
        message = set.message;
      }
      sets.push({publicKey: set.publicKey, signature: set.signature});
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
 * @param pubKeyCount - number of public key/signature pairs to aggregate
 * @param batchSize - number of sets to generate
 */
export function getBatchesOfAggregatedSignatureSets(pubKeyCount: number, batchSize: number): AggregatedSignatureSet[] {
  const aggregatedSets: AggregatedSignatureSet[] = [];
  const sameMessageSets = getBatchesOfSameMessageSignatureSets(pubKeyCount, batchSize);
  for (const {sets, message} of sameMessageSets) {
    const sigs = sets.map((set) => set.signature);
    const signature = aggregateSignatures(sigs).serialize();

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
 * @param pubKeyCount - number of public key/signature pairs to aggregate
 * @param batchSize - number of sets in each group, each with a single signature and message
 * @param numGroups - number of groups to generate
 * @returns
 */
export function getGroupsOfBatchesOfAggregatedSignatureSets(
  pubKeyCount: number,
  batchSize: number,
  numGroups: number
): AggregatedSignatureSet[][] {
  const groups = [] as AggregatedSignatureSet[][];
  for (let i = 0; i < numGroups; i++) {
    groups.push(getBatchesOfAggregatedSignatureSets(pubKeyCount, batchSize));
  }
  return groups;
}

/**
 * Gets groups of batches of signature sets. Gets both single and aggregated and
 * shuffles them together as would be expected in a real-world scenario.
 *
 * @param pubKeyCount - number of public key/signature pairs in a batch
 * @param batchSize - number of batches in each group
 * @param singleGroupsCount - number of groups of single signature sets
 * @param aggregatedGroupsCount - number of groups of aggregated signature sets
 * @returns
 */
export function getGroupsOfBatchesOfSignatureSets(
  pubKeyCount: number,
  batchSize: number,
  singleGroupsCount: number,
  aggregatedGroupsCount: number
): SignatureSetGroups {
  const single = getGroupsOfBatchesOfSingleSignatureSets(batchSize, singleGroupsCount);
  const aggregated = getGroupsOfBatchesOfAggregatedSignatureSets(pubKeyCount, batchSize, aggregatedGroupsCount);
  return shuffle([...single, ...aggregated]);
}
