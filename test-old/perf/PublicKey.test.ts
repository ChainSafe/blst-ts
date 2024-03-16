import {itBench} from "@dapplion/benchmark";
import * as napi from "../../lib";
import * as swig from "../../src";
import {arrayOfIndexes, getNapiSet, getSerializedSet, getSwigSet} from "../utils";

const napiTestKey = getNapiSet(0).publicKey;
const swigTestKey = getSwigSet(0).pk;

describe("PublicKey", () => {
  itBench("PublicKey serialization- Napi", () => {
    napiTestKey.serialize();
  });
  itBench("PublicKey serialization - Swig", () => {
    swigTestKey.toBytes();
  });

  itBench({
    id: "PublicKey deserialize - Napi",
    beforeEach: () => napiTestKey.serialize(),
    fn: (serialized) => {
      napi.PublicKey.deserialize(serialized, napi.CoordType.jacobian);
    },
  });
  itBench({
    id: "PublicKey deserialize - Swig",
    beforeEach: () => swigTestKey.toBytes(),
    fn: (serialized) => {
      swig.PublicKey.fromBytes(serialized, swig.CoordType.jacobian);
    },
  });

  for (const count of [1, 100, 10_000]) {
    itBench({
      id: `PublicKey deserialize and validate - Napi - ${count} keys`,
      beforeEach: () => arrayOfIndexes(0, count - 1).map((i) => getSerializedSet(i % 256).publicKey),
      fn: (publicKeys) => {
        for (const publicKey of publicKeys) {
          const key = napi.PublicKey.deserialize(publicKey, napi.CoordType.affine);
          key.keyValidate();
        }
      },
    });

    itBench({
      id: `PublicKey deserialize and validate - Swig - ${count} keys`,
      beforeEach: () => arrayOfIndexes(0, count - 1).map((i) => getSerializedSet(i % 256).publicKey),
      fn: (publicKeys) => {
        for (const publicKey of publicKeys) {
          const key = swig.PublicKey.fromBytes(publicKey, swig.CoordType.affine);
          key.keyValidate();
        }
      },
    });
  }
});
