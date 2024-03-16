import {itBench} from "@dapplion/benchmark";
import * as napi from "../../rebuild/lib";
import * as swig from "../../src";
import {keygenMaterial, commonMessage, getNapiSet, getSwigSet} from "../utils";

const napiTestKey = getNapiSet(0).secretKey;
const swigTestKey = getSwigSet(0).sk;

describe("SecretKey", () => {
  itBench("SecretKey.fromKeygen - Napi", () => {
    napi.SecretKey.fromKeygen(keygenMaterial);
  });
  itBench("SecretKey.fromKeygen - Swig", () => {
    swig.SecretKey.fromKeygen(keygenMaterial);
  });

  itBench("SecretKey serialization- Napi", () => {
    napiTestKey.serialize();
  });
  itBench("SecretKey serialization - Swig", () => {
    swigTestKey.toBytes();
  });

  itBench({
    id: "SecretKey deserialization - Napi",
    beforeEach: () => napiTestKey.serialize(),
    fn: (serialized) => {
      napi.SecretKey.deserialize(serialized);
    },
  });
  itBench({
    id: "SecretKey deserialization - Swig",
    beforeEach: () => swigTestKey.toBytes(),
    fn: (serialized) => {
      swig.SecretKey.fromBytes(serialized);
    },
  });

  itBench("SecretKey.toPublicKey - Napi", () => {
    napiTestKey.toPublicKey();
  });
  itBench("SecretKey.toPublicKey - Swig", () => {
    swigTestKey.toPublicKey();
  });

  itBench("SecretKey.sign - Napi", () => {
    napiTestKey.sign(commonMessage);
  });
  itBench("SecretKey.sign - SWig", () => {
    swigTestKey.sign(commonMessage);
  });
});
