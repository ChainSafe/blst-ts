import {itBench} from "@dapplion/benchmark";
import {CoordType, Signature} from "../../lib";
import {arrayOfIndexes, getTestSet, getSerializedTestSet} from "../utils";

const testSignature = getTestSet(0).signature;

describe("Signature", () => {
  itBench("Signature serialization", () => {
    testSignature.serialize();
  });

  itBench({
    id: "Signature deserialize",
    beforeEach: () => testSignature.serialize(),
    fn: (serialized) => {
      Signature.deserialize(serialized, CoordType.jacobian);
    },
  });

  for (const count of [1, 100, 10_000]) {
    itBench({
      id: `Signatures deserialize and validate - ${count} sets`,
      beforeEach: () => arrayOfIndexes(0, count - 1).map((i) => getSerializedTestSet(i % 256).signature),
      fn: (signatures) => {
        for (const signature of signatures) {
          const sig = Signature.deserialize(signature, CoordType.affine);
          sig.sigValidate();
        }
      },
    });
  }
});
