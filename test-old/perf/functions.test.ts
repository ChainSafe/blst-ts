import {itBench} from "@dapplion/benchmark";
import * as napi from "../../lib";
import * as swig from "../../src";
import {arrayOfIndexes, getNapiSet, getNapiSetSameMessage, getSwigSet, getSwigSetSameMessage} from "../utils";

describe("functions", () => {
  describe("aggregatePublicKeys", () => {
    for (const count of [1, 8, 32, 128, 256]) {
      itBench({
        id: `aggregatePublicKeys - Napi - ${count} sets`,
        beforeEach: () => arrayOfIndexes(0, count - 1).map((i) => getNapiSet(i).publicKey),
        fn: (publicKeys) => {
          napi.aggregatePublicKeys(publicKeys);
        },
      });

      itBench({
        id: `aggregatePublicKeys - Swig - ${count} sets`,
        beforeEach: () => arrayOfIndexes(0, count - 1).map((i) => getSwigSet(i).pk),
        fn: (publicKeys) => {
          swig.aggregatePubkeys(publicKeys);
        },
      });
    }
  });
  describe("aggregateSignatures", () => {
    for (const count of [1, 8, 32, 128, 256]) {
      itBench({
        id: `aggregateSignatures - Napi - ${count} sets`,
        beforeEach: () => arrayOfIndexes(0, count - 1).map((i) => getNapiSet(i).signature),
        fn: (signatures) => {
          napi.aggregateSignatures(signatures);
        },
      });

      itBench({
        id: `aggregateSignatures - Swig - ${count} sets`,
        beforeEach: () => arrayOfIndexes(0, count - 1).map((i) => getSwigSet(i).sig),
        fn: (signatures) => {
          swig.aggregateSignatures(signatures);
        },
      });
    }
  });
  describe("aggregateVerify", () => {
    for (const count of [1, 8, 32, 128, 256]) {
      itBench({
        id: `aggregateVerify - Napi - ${count} sets`,
        beforeEach: () => {
          const sets = arrayOfIndexes(0, count - 1)
            .map((i) => getNapiSet(i))
            .reduce(
              (sets, set) => ({
                messages: [...sets.messages, set.message],
                publicKeys: [...sets.publicKeys, set.publicKey],
                signatures: [...sets.signatures, set.signature],
              }),
              {
                messages: [] as Uint8Array[],
                publicKeys: [] as napi.PublicKeyArg[],
                signatures: [] as napi.SignatureArg[],
              }
            );
          return {
            messages: sets.messages,
            publicKeys: sets.publicKeys,
            signature: napi.aggregateSignatures(sets.signatures),
          };
        },
        fn: ({messages, publicKeys, signature}) => {
          napi.aggregateVerify(messages, publicKeys, signature);
        },
      });
      itBench({
        id: `aggregateVerify - Swig - ${count} sets`,
        beforeEach: () => {
          const sets = arrayOfIndexes(0, count - 1)
            .map((i) => getSwigSet(i))
            .reduce(
              (sets, set) => ({
                messages: [...sets.messages, set.msg],
                publicKeys: [...sets.publicKeys, set.pk],
                signatures: [...sets.signatures, set.sig],
              }),
              {
                messages: [] as Uint8Array[],
                publicKeys: [] as swig.PublicKey[],
                signatures: [] as swig.Signature[],
              }
            );
          return {
            messages: sets.messages,
            publicKeys: sets.publicKeys,
            signature: swig.aggregateSignatures(sets.signatures),
          };
        },
        fn: ({messages, publicKeys, signature}) => {
          swig.aggregateVerify(messages, publicKeys, signature);
        },
      });
    }
  });
  describe("verifyMultipleAggregateSignatures", () => {
    for (const count of [1, 8, 32, 128, 256]) {
      itBench({
        id: `verifyMultipleAggregateSignatures - Napi - ${count} sets`,
        beforeEach: () => arrayOfIndexes(0, count - 1).map((i) => getNapiSet(i)),
        fn: (sets) => {
          napi.verifyMultipleAggregateSignatures(sets);
        },
      });
      itBench({
        id: `verifyMultipleAggregateSignatures - Swig - ${count} sets`,
        beforeEach: () => arrayOfIndexes(0, count - 1).map((i) => getSwigSet(i)),
        fn: (sets) => {
          swig.verifyMultipleAggregateSignatures(sets);
        },
      });
    }
  });
  describe("verifyMultipleAggregateSignatures same message", () => {
    for (const count of [1, 8, 32, 128, 256]) {
      itBench({
        id: `Same message - Napi - ${count} sets`,
        beforeEach: () =>
          arrayOfIndexes(0, count - 1)
            .map((i) => getNapiSetSameMessage(i))
            .map((set) => {
              return {
                message: set.message,
                secretKey: set.secretKey,
                publicKey: set.publicKey,
                signature: set.signature.serialize(),
              };
            }),
        fn: (sets) => {
          const aggregatedPubkey = napi.aggregatePublicKeys(sets.map((set) => set.publicKey));
          const aggregatedSignature = napi.aggregateSignatures(
            sets.map((set) => {
              const sig = napi.Signature.deserialize(set.signature, napi.CoordType.affine);
              sig.sigValidate();
              return sig;
            })
          );
          const isValid = napi.verify(sets[0].message, aggregatedPubkey, aggregatedSignature);
          if (!isValid) throw Error("Invalid");
        },
      });
      itBench({
        id: `Same message - Swig - ${count} sets`,
        beforeEach: () =>
          arrayOfIndexes(0, count - 1)
            .map((i) => getSwigSetSameMessage(i))
            .map((set) => {
              return {
                msg: set.msg,
                sk: set.sk,
                pk: set.pk,
                sig: set.sig.toBytes(),
              };
            }),
        fn: (sets) => {
          const aggregatedPubkey = swig.aggregatePubkeys(sets.map((set) => set.pk));
          const aggregatedSignature = swig.aggregateSignatures(
            sets.map((set) => {
              const sig = swig.Signature.fromBytes(set.sig, swig.CoordType.affine);
              sig.sigValidate();
              return sig;
            })
          );
          const isValid = swig.verify(sets[0].msg, aggregatedPubkey, aggregatedSignature);
          if (!isValid) throw Error("Invalid");
        },
      });
    }
  });
});
