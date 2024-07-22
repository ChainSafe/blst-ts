import {itBench} from "@dapplion/benchmark";
import * as blst from "../../index.js";
import {arrayOfIndexes, getTestSet, getSerializedTestSet} from "../utils";

const napiTestSignature = getTestSet(0).sig;

describe("Signature", () => {
  itBench("Signature serialization", () => {
    napiTestSignature.toBytes();
  });

  itBench({
    id: "Signature deserialize",
    beforeEach: () => napiTestSignature.toBytes(),
    fn: (serialized) => {
      blst.Signature.fromBytes(serialized);
    },
  });

  for (const count of [1, 100, 10_000]) {
    itBench({
      id: `Signatures deserialize and validate - ${count} sets`,
      before() {
        return arrayOfIndexes(0, count - 1).map((i) => getSerializedTestSet(i % 256).sig);
      },
      beforeEach: (sigs) => sigs,
      fn: (signatures) => {
        for (const signature of signatures) {
          blst.Signature.fromBytes(signature, true);
        }
      },
    });
  }
});
