import {itBench} from "@dapplion/benchmark";
import * as blst from "../../rebuild/lib";
import {arrayOfIndexes, getNapiSet, getSerializedSet} from "../utils";

const napiTestSignature = getNapiSet(0).signature;

describe("Signature", () => {
  itBench("Signature serialization", () => {
    napiTestSignature.serialize();
  });

  itBench({
    id: "Signature deserialize",
    beforeEach: () => napiTestSignature.serialize(),
    fn: (serialized) => {
      blst.Signature.deserialize(serialized, blst.CoordType.jacobian);
    },
  });

  for (const count of [1, 100, 10_000]) {
    itBench({
      id: `Signatures deserialize and validate - ${count} sets`,
      beforeEach: () => arrayOfIndexes(0, count - 1).map((i) => getSerializedSet(i % 256).signature),
      fn: (signatures) => {
        for (const signature of signatures) {
          const sig = blst.Signature.deserialize(signature, blst.CoordType.affine);
          sig.sigValidate();
        }
      },
    });
  }
});
