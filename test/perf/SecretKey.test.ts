import {itBench} from "@dapplion/benchmark";
import {SecretKey} from "../../lib";
import {keygenMaterial, commonMessage, getTestSet} from "../utils";

const testKey = getTestSet(0).secretKey;

describe("SecretKey", () => {
  itBench("SecretKey.fromKeygen", () => {
    SecretKey.fromKeygen(keygenMaterial);
  });

  itBench("SecretKey serialization", () => {
    testKey.serialize();
  });

  itBench({
    id: "SecretKey deserialization",
    beforeEach: () => testKey.serialize(),
    fn: (serialized) => {
      SecretKey.deserialize(serialized);
    },
  });

  itBench("SecretKey.toPublicKey", () => {
    testKey.toPublicKey();
  });

  itBench("SecretKey.sign", () => {
    testKey.sign(commonMessage);
  });
});
