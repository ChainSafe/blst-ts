import {itBench} from "@dapplion/benchmark";
import * as blst from "../../lib";
import {arrayOfIndexes, getTestSet, getTestSetSameMessage, getTestSetsSameMessage} from "../utils";

describe("functions", () => {
  describe("aggregatePublicKeys", () => {
    for (const count of [1, 8, 32, 128, 256]) {
      itBench({
        id: `aggregatePublicKeys - ${count} sets`,
        beforeEach: () => arrayOfIndexes(0, count - 1).map((i) => getTestSet(i).publicKey),
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
        beforeEach: () => arrayOfIndexes(0, count - 1).map((i) => getTestSet(i).signature),
        fn: (signatures) => {
          blst.aggregateSignatures(signatures);
        },
      });
    }
  });
  describe("aggregateWithRandomness", () => {
    const SAME_MESSAGE_SET_COUNT = 1024;
    itBench({
      id: "JS version of aggregateWithRandomness",
      beforeEach: () => {
        const {sets} = getTestSetsSameMessage(SAME_MESSAGE_SET_COUNT);
        return sets.map((s) => ({
          publicKey: s.publicKey,
          signature: s.signature.serialize(),
        }));
      },
      fn: (sets) => {
        const signatures = sets.map((set) => {
          const sig = blst.Signature.deserialize(set.signature, blst.CoordType.jacobian);
          sig.sigValidate();
          return sig;
        });
        const randomness: Uint8Array[] = [];
        for (let i = 0; i < sets.length; i++) {
          randomness.push(blst.randomBytesNonZero(8));
        }
        blst.aggregatePublicKeys(sets.map((set, i) => set.publicKey.multiplyBy(randomness[i])));
        blst.aggregateSignatures(signatures.map((sig, i) => sig.multiplyBy(randomness[i])));
      },
    });
    itBench({
      id: "native version of aggregateWithRandomness",
      beforeEach: () => {
        const {sets} = getTestSetsSameMessage(SAME_MESSAGE_SET_COUNT);
        return sets.map((s) => ({
          publicKey: s.publicKey,
          signature: s.signature.serialize(),
        }));
      },
      fn: (sets) => {
        blst.aggregateWithRandomness(sets, true);
      },
    });
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
                messages: [...sets.messages, set.message],
                publicKeys: [...sets.publicKeys, set.publicKey],
                signatures: [...sets.signatures, set.signature],
              }),
              {
                messages: [] as Uint8Array[],
                publicKeys: [] as blst.PublicKeyArg[],
                signatures: [] as blst.SignatureArg[],
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
                message: set.message,
                secretKey: set.secretKey,
                publicKey: set.publicKey,
                signature: set.signature.serialize(),
              };
            }),
        fn: (sets) => {
          const aggregatedPubkey = blst.aggregatePublicKeys(sets.map((set) => set.publicKey));
          const aggregatedSignature = blst.aggregateSignatures(
            sets.map((set) => {
              const sig = blst.Signature.deserialize(set.signature, blst.CoordType.affine);
              sig.sigValidate();
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
