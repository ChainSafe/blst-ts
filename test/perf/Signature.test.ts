import {itBench} from "@dapplion/benchmark";
import * as blst from "../../lib";
import {arrayOfIndexes, getTestSet, getSerializedTestSet} from "../utils";

const napiTestSignature = getTestSet(0).signature;

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
      beforeEach: () => arrayOfIndexes(0, count - 1).map((i) => getSerializedTestSet(i % 256).signature),
      fn: (signatures) => {
        for (const signature of signatures) {
          const sig = blst.Signature.deserialize(signature, blst.CoordType.affine);
          sig.sigValidate();
        }
      },
    });
  }
});
