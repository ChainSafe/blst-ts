import {SignatureSet} from "../../../index.js";
import {chunkifyMaximizeChunkSize} from "../../utils";
import {WorkResult, WorkResultCode, BlsWorkResult, BlsWorkRequest, ISignatureSet, SignatureSetType} from "./types";
import {verifySignatureSets} from "./verify";

const BATCHABLE_MIN_PER_CHUNK = 16;

export async function runWorkRequests(workReqArr: BlsWorkRequest[]): Promise<BlsWorkResult> {
  const results: WorkResult<boolean>[] = [];
  let batchRetries = 0;
  let batchSigsSuccess = 0;

  // If there are multiple batchable sets attempt batch verification with them
  const batchableSets: {idx: number; sets: SignatureSet[]}[] = [];
  const nonBatchableSets: {idx: number; sets: SignatureSet[]}[] = [];

  // Split sets between batchable and non-batchable preserving their original index in the req array
  for (let i = 0; i < workReqArr.length; i++) {
    const workReq = workReqArr[i];
    if (workReq.opts.batchable) {
      batchableSets.push({idx: i, sets: workReq.sets as SignatureSet[]});
    } else {
      nonBatchableSets.push({idx: i, sets: workReq.sets as SignatureSet[]});
    }
  }

  if (batchableSets.length > 0) {
    // Split batchable into chunks of max size ~ 32 to minimize cost if a sig is wrong
    const batchableChunks = chunkifyMaximizeChunkSize(batchableSets, BATCHABLE_MIN_PER_CHUNK);

    for (const batchableChunk of batchableChunks) {
      // flatten all sets into a single array for batch verification
      const allSets: ISignatureSet[] = [];
      for (const {sets} of batchableChunk) {
        // TODO: speed test in perf for potential switch to allSets.push(...sets);
        for (const set of sets) {
          allSets.push({
            type: SignatureSetType.single,
            signingRoot: set.msg,
            pubkey: set.pk,
            signature: set.sig.toBytes(),
          });
        }
      }

      try {
        // Attempt to verify multiple sets at once
        const isValid = verifySignatureSets(allSets);

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

  nonBatchableSets.map(({idx, sets}) => {
    results[idx] = {
      code: WorkResultCode.success,
      result: verifySignatureSets(
        sets.map((set) => ({
          type: SignatureSetType.single,
          signingRoot: set.msg,
          pubkey: set.pk,
          signature: set.sig.toBytes(),
        }))
      ),
    };
  });

  return {
    batchRetries,
    batchSigsSuccess,
    results,
  };
}
