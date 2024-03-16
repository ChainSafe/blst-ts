import {itBench} from "@dapplion/benchmark";
import {CoordType, PublicKey} from "../../lib";
import {arrayOfIndexes, getTestSet, getSerializedTestSet} from "../utils";

const testKey = getTestSet(0).publicKey;

describe("PublicKey", () => {
  itBench("PublicKey serialization", () => {
    testKey.serialize();
  });

  itBench({
    id: "PublicKey deserialize",
    beforeEach: () => testKey.serialize(),
    fn: (serialized) => {
      PublicKey.deserialize(serialized, CoordType.jacobian);
    },
  });

  for (const count of [1, 100, 10_000]) {
    itBench({
      id: `PublicKey deserialize and validate - ${count} keys`,
      beforeEach: () => arrayOfIndexes(0, count - 1).map((i) => getSerializedTestSet(i % 256).publicKey),
      fn: (publicKeys) => {
        for (const publicKey of publicKeys) {
          const key = PublicKey.deserialize(publicKey, CoordType.affine);
          key.keyValidate();
        }
      },
    });
  }
});
