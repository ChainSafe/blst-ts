import {itBench} from "@dapplion/benchmark";
import * as blst from "../../index.js";
import {arrayOfIndexes, getTestSet, getTestSetSameMessage, getTestSetsSameMessage} from "../utils";

describe("functions", () => {
  describe("aggregatePublicKeys", () => {
    for (const count of [1, 8, 32, 128, 256]) {
      itBench({
        id: `aggregatePublicKeys - ${count} sets`,
        beforeEach: () => arrayOfIndexes(0, count - 1).map((i) => getTestSet(i).pk),
        fn: (publicKeys) => {
          blst.aggregatePublicKeys(publicKeys);
        },
      });
    }
  });
  describe("aggregateSignatures", () => {
    for (const count of [1, 8, 32, 128, 256]) {
      itBench({
        id: `aggregateSignatures - ${count} sets`,
        beforeEach: () => arrayOfIndexes(0, count - 1).map((i) => getTestSet(i).sig),
        fn: (signatures) => {
          blst.aggregateSignatures(signatures);
        },
      });
    }
  });
  describe("aggregateWithRandomness", () => {
    for (const count of [1, 16, 128, 256, 512, 1024]) {
      itBench({
        id: `aggregateWithRandomness - ${count} sets`,
        before: () => {
          const {sets} = getTestSetsSameMessage(count);
          return sets.map((s) => ({
            pk: s.pk,
            sig: s.sig.toBytes(),
          }));
        },
        beforeEach: (sets) => sets,
        fn: (sets) => {
          blst.aggregateWithRandomness(sets);
        },
      });
    }
  });
  describe("aggregateVerify", () => {
    for (const count of [1, 8, 32, 128, 256]) {
      itBench({
        id: `aggregateVerify - ${count} sets`,
        beforeEach: () => {
          const sets = arrayOfIndexes(0, count - 1)
            .map((i) => getTestSet(i))
            .reduce(
              (sets, set) => ({
                messages: [...sets.messages, set.msg],
                publicKeys: [...sets.publicKeys, set.pk],
                signatures: [...sets.signatures, set.sig],
              }),
              {
                messages: [] as Uint8Array[],
                publicKeys: [] as blst.PublicKey[],
                signatures: [] as blst.Signature[],
              }
            );
          return {
            messages: sets.messages,
            publicKeys: sets.publicKeys,
            signature: blst.aggregateSignatures(sets.signatures),
          };
        },
        fn: ({messages, publicKeys, signature}) => {
          blst.aggregateVerify(messages, publicKeys, signature);
        },
      });
    }
  });
  describe("verifyMultipleAggregateSignatures", () => {
    for (const count of [1, 8, 32, 128, 256]) {
      itBench({
        id: `verifyMultipleAggregateSignatures - ${count} sets`,
        beforeEach: () => arrayOfIndexes(0, count - 1).map((i) => getTestSet(i)),
        fn: (sets) => {
          blst.verifyMultipleAggregateSignatures(sets);
        },
      });
    }
  });
  describe("verifyMultipleAggregateSignatures same message", () => {
    for (const count of [1, 8, 32, 128, 256]) {
      itBench({
        id: `Same message - ${count} sets`,
        beforeEach: () =>
          arrayOfIndexes(0, count - 1)
            .map((i) => getTestSetSameMessage(i))
            .map((set) => {
              return {
                message: set.msg,
                secretKey: set.sk,
                publicKey: set.pk,
                signature: set.sig.toBytes(),
              };
            }),
        fn: (sets) => {
          const aggregatedPubkey = blst.aggregatePublicKeys(sets.map((set) => set.publicKey));
          const aggregatedSignature = blst.aggregateSignatures(
            sets.map((set) => {
              const sig = blst.Signature.fromBytes(set.signature, true, true);
              return sig;
            })
          );
          const isValid = blst.verify(sets[0].message, aggregatedPubkey, aggregatedSignature);
          if (!isValid) throw Error("Invalid");
        },
      });
    }
  });
});
