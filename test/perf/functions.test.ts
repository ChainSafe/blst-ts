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
    for (const count of [1, 8, 64, 512, 2048, 16_000]) {
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
    for (const count of [1, 8, 64, 512, 2048, 16_000]) {
      itBench({
        id: `verifyMultipleAggregateSignatures - ${count} sets`,
        beforeEach: () =>
          arrayOfIndexes(0, count - 1).map((i) => {
            const set = getTestSet(i);
            return {
              msg: set.msg,
              pk: set.pk,
              sig: set.sig.toBytes(),
            };
          }),
        fn: (sets) => {
          blst.verifyMultipleAggregateSignatures(
            sets.map((set) => {
              const sig = blst.Signature.fromBytes(set.sig);
              sig.sigValidate();
              return {
                msg: set.msg,
                pk: set.pk,
                sig,
              };
            })
          );
        },
      });
    }
  });
  describe("verifyMultipleAggregateSignatures same message", () => {
    for (const count of [1, 8, 64, 512, 2048, 16_000]) {
      itBench({
        id: `Same message - ${count} sets`,
        beforeEach: () =>
          arrayOfIndexes(0, count - 1)
            .map((i) => getTestSetSameMessage(i))
            .map((set) => {
              return {
                msg: set.msg,
                sk: set.sk,
                pk: set.pk,
                sig: set.sig.toBytes(),
              };
            }),
        fn: (sets) => {
          const {pk, sig} = blst.aggregateWithRandomness(sets);
          const isValid = blst.verify(sets[0].msg, pk, sig);
          if (!isValid) throw Error("Invalid");
        },
      });
    }
  });
});
