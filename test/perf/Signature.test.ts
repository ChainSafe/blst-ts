import {itBench} from "@dapplion/benchmark";
import * as napi from "../../rebuild/lib";
import * as swig from "../../src";
import {arrayOfIndexes, getNapiSet, getSerializedSet, getSwigSet} from "../utils";

const napiTestSignature = getNapiSet(0).signature;
const swigTestSignature = getSwigSet(0).sig;

describe("Signature", () => {
  itBench("Signature serialization- Napi", () => {
    napiTestSignature.serialize();
  });
  itBench("Signature serialization - Swig", () => {
    swigTestSignature.toBytes();
  });

  itBench({
    id: "Signature deserialize - Napi",
    beforeEach: () => napiTestSignature.serialize(),
    fn: (serialized) => {
      napi.Signature.deserialize(serialized, napi.CoordType.jacobian);
    },
  });
  itBench({
    id: "Signature deserialize - Swig",
    beforeEach: () => swigTestSignature.toBytes(),
    fn: (serialized) => {
      swig.Signature.fromBytes(serialized, swig.CoordType.jacobian);
    },
  });

  for (const count of [1, 100, 10_000]) {
    itBench({
      id: `Signatures deserialize and validate - Napi - ${count} sets`,
      beforeEach: () => arrayOfIndexes(0, count - 1).map((i) => getSerializedSet(i % 256).signature),
      fn: (signatures) => {
        for (const signature of signatures) {
          const sig = napi.Signature.deserialize(signature, napi.CoordType.affine);
          sig.sigValidate();
        }
      },
    });

    itBench({
      id: `Signatures deserialize and validate - Swig - ${count} sets`,
      beforeEach: () => arrayOfIndexes(0, count - 1).map((i) => getSerializedSet(i % 256).signature),
      fn: (signatures) => {
        for (const signature of signatures) {
          const sig = swig.Signature.fromBytes(signature, swig.CoordType.affine);
          sig.sigValidate();
        }
      },
    });
  }
});
