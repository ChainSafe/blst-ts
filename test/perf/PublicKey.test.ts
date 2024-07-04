import {itBench} from "@dapplion/benchmark";
import * as blst from "../../index.js";
import {arrayOfIndexes, getTestSet, getSerializedTestSet} from "../utils";

const napiTestKey = getTestSet(0).pk;

describe("PublicKey", () => {
  itBench("PublicKey serialization", () => {
    napiTestKey.toBytes();
  });

  itBench({
    id: "PublicKey deserialize",
    beforeEach: () => napiTestKey.toBytes(),
    fn: (serialized) => {
      blst.PublicKey.fromBytes(serialized);
    },
  });

  for (const count of [1, 100, 10_000]) {
    itBench({
      id: `PublicKey deserialize and validate - ${count} keys`,
      beforeEach: () => arrayOfIndexes(0, count - 1).map((i) => getSerializedTestSet(i % 256).pk),
      fn: (publicKeys) => {
        for (const publicKey of publicKeys) {
          const key = blst.PublicKey.fromBytes(publicKey, true);
        }
      },
    });
  }
});
