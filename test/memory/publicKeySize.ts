import {memoryTest} from "../utils/memory/testRunner";
import * as napi from "../../rebuild/lib";
import * as swig from "../../src/";

const pk = napi.SecretKey.fromKeygen(Buffer.alloc(32, "*&@#")).toPublicKey().serialize();

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async function runMemoryTests() {
  await memoryTest(
    [
      {
        id: "Napi PublicKey",
        getInstance: () => napi.PublicKey.deserialize(pk),
      },
      {
        id: "Swig PublicKey",
        getInstance: () => swig.PublicKey.fromBytes(pk),
      },
    ],
    {
      warmUpIterations: 100,
      gcDelay: 50,
      displayRunInfo: true,
      sampleEvery: 1000,
      maxInstances: 10_000,
      computeUsedMemory: (usage) => usage.heapUsed + usage.external + usage.arrayBuffers,
    }
  );
})();
