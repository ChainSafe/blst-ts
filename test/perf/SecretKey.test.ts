import {itBench} from "@dapplion/benchmark";
import * as blst from "../../index.js";
import {commonMessage, getTestSet} from "../utils";

const napiTestKey = getTestSet(0).sk;

describe("SecretKey", () => {
  const ikm = Buffer.alloc(32, 1);
  itBench("SecretKey.fromKeygen", () => {
    blst.SecretKey.fromKeygen(ikm);
  });

  itBench("SecretKey serialization", () => {
    napiTestKey.toBytes();
  });

  itBench({
    id: "SecretKey deserialization",
    beforeEach: () => napiTestKey.toBytes(),
    fn: (serialized) => {
      blst.SecretKey.fromBytes(serialized);
    },
  });

  itBench("SecretKey.toPublicKey", () => {
    napiTestKey.toPublicKey();
  });

  itBench("SecretKey.sign", () => {
    napiTestKey.sign(commonMessage);
  });
});
