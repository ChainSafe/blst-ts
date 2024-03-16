import {memoryTest} from "../utils/memory/testRunner";
import * as napi from "../../rebuild/lib";
import * as swig from "../../src";

const sk = napi.SecretKey.fromKeygen(Buffer.alloc(32, "*&@#"));
const skBytes = sk.serialize();
const pk = sk.toPublicKey().serialize();
const sig = sk.sign(Buffer.alloc(32, "*&@#")).serialize();

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async function runMemoryTests() {
  await memoryTest(
    [
      {
        id: "Napi SecretKey",
        getInstance: () => napi.SecretKey.deserialize(skBytes),
      },
      {
        id: "Swig SecretKey",
        getInstance: () => swig.SecretKey.fromBytes(skBytes),
      },
      {
        id: "Napi PublicKey",
        getInstance: () => napi.PublicKey.deserialize(pk),
      },
      {
        id: "Swig PublicKey",
        getInstance: () => swig.PublicKey.fromBytes(pk),
      },
      {
        id: "Napi Signature",
        getInstance: () => napi.Signature.deserialize(sig),
      },
      {
        id: "Swig Signature",
        getInstance: () => swig.Signature.fromBytes(sig),
      },
    ],
    {
      warmUpIterations: 10_000,
      gcDelay: 100,
      convergeFactor: 0.1 / 100,
      displayRunInfo: true,
      sampleEvery: 1000,
      maxInstances: 1_000_000,
      computeUsedMemory: (usage) => usage.heapUsed + usage.external + usage.arrayBuffers,
    }
  );
})();
