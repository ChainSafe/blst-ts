import {itBench} from "@dapplion/benchmark";
import {
  CoordType,
  PublicKeyArg,
  Signature,
  SignatureArg,
  aggregatePublicKeys,
  aggregateSignatures,
  aggregateVerify,
  verify,
  verifyMultipleAggregateSignatures,
} from "../../lib";
import {arrayOfIndexes, getTestSet, getTestSetSameMessage} from "../utils";

describe("functions", () => {
  describe("aggregatePublicKeys", () => {
    for (const count of [1, 8, 32, 128, 256]) {
      itBench({
        id: `aggregatePublicKeys - ${count} sets`,
        beforeEach: () => arrayOfIndexes(0, count - 1).map((i) => getTestSet(i).publicKey),
        fn: (publicKeys) => {
          aggregatePublicKeys(publicKeys);
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
          aggregateSignatures(signatures);
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
                messages: [...sets.messages, set.message],
                publicKeys: [...sets.publicKeys, set.publicKey],
                signatures: [...sets.signatures, set.signature],
              }),
              {
                messages: [] as Uint8Array[],
                publicKeys: [] as PublicKeyArg[],
                signatures: [] as SignatureArg[],
              }
            );
          return {
            messages: sets.messages,
            publicKeys: sets.publicKeys,
            signature: aggregateSignatures(sets.signatures),
          };
        },
        fn: ({messages, publicKeys, signature}) => {
          aggregateVerify(messages, publicKeys, signature);
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
          verifyMultipleAggregateSignatures(sets);
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
          const aggregatedPubkey = aggregatePublicKeys(sets.map((set) => set.publicKey));
          const aggregatedSignature = aggregateSignatures(
            sets.map((set) => {
              const sig = Signature.deserialize(set.signature, CoordType.affine);
              sig.sigValidate();
              return sig;
            })
          );
          const isValid = verify(sets[0].message, aggregatedPubkey, aggregatedSignature);
          if (!isValid) throw Error("Invalid");
        },
      });
    }
  });
});
