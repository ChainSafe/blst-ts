import {SignatureSet as SwigSignatureSet} from "../../../src";
import {SignatureSet as NapiSignatureSet} from "../../../rebuild/lib";

import {chunkifyMaximizeChunkSize} from "./utils";
import {asyncVerifyNapiSignatureSets, verifySwigSignatureSets} from "./verify";
import {WorkResult, WorkResultCode, BlsWorkResult, BlsWorkRequest} from "./types";

const BATCHABLE_MIN_PER_CHUNK = 16;

export function runSwigWorkRequests(workerId: number, workReqArr: BlsWorkRequest[]): BlsWorkResult {
  const results: WorkResult<boolean>[] = [];
  let batchRetries = 0;
  let batchSigsSuccess = 0;

  // If there are multiple batchable sets attempt batch verification with them
  const batchableSets: {idx: number; sets: SwigSignatureSet[]}[] = [];
  const nonBatchableSets: {idx: number; sets: SwigSignatureSet[]}[] = [];

  // Split sets between batchable and non-batchable preserving their original index in the req array
  for (let i = 0; i < workReqArr.length; i++) {
    const workReq = workReqArr[i];

    if (workReq.opts.batchable) {
      batchableSets.push({idx: i, sets: workReq.sets as SwigSignatureSet[]});
    } else {
      nonBatchableSets.push({idx: i, sets: workReq.sets as SwigSignatureSet[]});
    }
  }

  if (batchableSets.length > 0) {
    // Split batchable into chunks of max size ~ 32 to minimize cost if a sig is wrong
    const batchableChunks = chunkifyMaximizeChunkSize(batchableSets, BATCHABLE_MIN_PER_CHUNK);

    for (const batchableChunk of batchableChunks) {
      // flatten all sets into a single array for batch verification
      const allSets: SwigSignatureSet[] = [];
      for (const {sets} of batchableChunk) {
        // TODO: speed test in perf for potential switch to allSets.push(...sets);
        for (const set of sets) {
          allSets.push(set);
        }
      }

      try {
        // Attempt to verify multiple sets at once
        const isValid = verifySwigSignatureSets(allSets);

        if (isValid) {
          // The entire batch is valid, return success to all
          for (const {idx, sets} of batchableChunk) {
            batchSigsSuccess += sets.length;
            results[idx] = {code: WorkResultCode.success, result: isValid};
          }
        } else {
          batchRetries++;
          // Re-verify all sigs individually
          nonBatchableSets.push(...batchableChunk);
        }
      } catch (e) {
        // TODO: Ignore this error expecting that the same error will happen when re-verifying the set individually
        //       It's not ideal but '@chainsafe/blst' may throw errors on some conditions
        batchRetries++;
        // Re-verify all sigs
        nonBatchableSets.push(...batchableChunk);
      }
    }
  }

  for (const {idx, sets} of nonBatchableSets) {
    try {
      const isValid = verifySwigSignatureSets(sets);
      results[idx] = {code: WorkResultCode.success, result: isValid};
    } catch (e) {
      results[idx] = {code: WorkResultCode.error, error: e as Error};
    }
  }

  return {
    workerId,
    batchRetries,
    batchSigsSuccess,
    results,
  };
}

export async function runNapiWorkRequests(workReqArr: BlsWorkRequest[]): Promise<BlsWorkResult> {
  const results: WorkResult<boolean>[] = [];
  let batchRetries = 0;
  let batchSigsSuccess = 0;

  // If there are multiple batchable sets attempt batch verification with them
  const batchableSets: {idx: number; sets: NapiSignatureSet[]}[] = [];
  const nonBatchableSets: {idx: number; sets: NapiSignatureSet[]}[] = [];

  // Split sets between batchable and non-batchable preserving their original index in the req array
  for (let i = 0; i < workReqArr.length; i++) {
    const workReq = workReqArr[i];
    if (workReq.opts.batchable) {
      batchableSets.push({idx: i, sets: workReq.sets as NapiSignatureSet[]});
    } else {
      nonBatchableSets.push({idx: i, sets: workReq.sets as NapiSignatureSet[]});
    }
  }

  if (batchableSets.length > 0) {
    // Split batchable into chunks of max size ~ 32 to minimize cost if a sig is wrong
    const batchableChunks = chunkifyMaximizeChunkSize(batchableSets, BATCHABLE_MIN_PER_CHUNK);

    for (const batchableChunk of batchableChunks) {
      // flatten all sets into a single array for batch verification
      const allSets: NapiSignatureSet[] = [];
      for (const {sets} of batchableChunk) {
        // TODO: speed test in perf for potential switch to allSets.push(...sets);
        for (const set of sets) {
          allSets.push(set);
        }
      }

      try {
        // Attempt to verify multiple sets at once
        const isValid = await asyncVerifyNapiSignatureSets(allSets);

        if (isValid) {
          // The entire batch is valid, return success to all
          for (const {idx, sets} of batchableChunk) {
            batchSigsSuccess += sets.length;
            results[idx] = {code: WorkResultCode.success, result: isValid};
          }
        } else {
          batchRetries++;
          // Re-verify all sigs individually
          nonBatchableSets.push(...batchableChunk);
        }
      } catch (e) {
        // TODO: Ignore this error expecting that the same error will happen when re-verifying the set individually
        //       It's not ideal but '@chainsafe/blst' may throw errors on some conditions
        batchRetries++;
        // Re-verify all sigs
        nonBatchableSets.push(...batchableChunk);
      }
    }
  }

  await Promise.all(
    nonBatchableSets.map(({idx, sets}) =>
      asyncVerifyNapiSignatureSets(sets)
        .then((isValid) => {
          results[idx] = {code: WorkResultCode.success, result: isValid};
        })
        .catch((e) => {
          results[idx] = {code: WorkResultCode.error, error: e as Error};
        })
    )
  );

  return {
    batchRetries,
    batchSigsSuccess,
    results,
  };
}
