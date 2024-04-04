import {itBench} from "@dapplion/benchmark";
import * as blst from "../../rebuild/lib";
import {keygenMaterial, commonMessage, getTestSet} from "../utils";

const napiTestKey = getTestSet(0).secretKey;

describe("SecretKey", () => {
  itBench("SecretKey.fromKeygen", () => {
    blst.SecretKey.fromKeygen(keygenMaterial);
  });

  itBench("SecretKey serialization- Napi", () => {
    napiTestKey.serialize();
  });

  itBench({
    id: "SecretKey deserialization",
    beforeEach: () => napiTestKey.serialize(),
    fn: (serialized) => {
      blst.SecretKey.deserialize(serialized);
    },
  });

  itBench("SecretKey.toPublicKey", () => {
    napiTestKey.toPublicKey();
  });

  itBench("SecretKey.sign", () => {
    napiTestKey.sign(commonMessage);
  });
});
