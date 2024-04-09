import {itBench} from "@dapplion/benchmark";
import * as blst from "../../lib";
import {arrayOfIndexes, getTestSet, getSerializedTestSet} from "../utils";

const napiTestKey = getTestSet(0).publicKey;

describe("PublicKey", () => {
  itBench("PublicKey serialization", () => {
    napiTestKey.serialize();
  });

  itBench({
    id: "PublicKey deserialize",
    beforeEach: () => napiTestKey.serialize(),
    fn: (serialized) => {
      blst.PublicKey.deserialize(serialized, blst.CoordType.jacobian);
    },
  });

  for (const count of [1, 100, 10_000]) {
    itBench({
      id: `PublicKey deserialize and validate - ${count} keys`,
      beforeEach: () => arrayOfIndexes(0, count - 1).map((i) => getSerializedTestSet(i % 256).publicKey),
      fn: (publicKeys) => {
        for (const publicKey of publicKeys) {
          const key = blst.PublicKey.deserialize(publicKey, blst.CoordType.affine);
          key.keyValidate();
        }
      },
    });
  }
});
