import {memoryTest} from "../utils/memory/testRunner";
import * as napi from "../../rebuild/lib";

const testSet = getSerializedTestSet();

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async function runMemoryTests() {
  await memoryTest(
    [
      {
        id: "Napi SecretKey",
        getInstance: () => napi.SecretKey.deserialize(testSet.secretKey),
      },
      {
        id: "Napi PublicKey",
        getInstance: () => napi.PublicKey.deserialize(testSet.publicKey),
      },
      {
        id: "Napi Signature",
        getInstance: () => napi.Signature.deserialize(testSet.signature),
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
