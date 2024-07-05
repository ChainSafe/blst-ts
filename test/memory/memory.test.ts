import {memoryTest} from "../utils/memory/testRunner";
import * as napi from "../../index.js";

const sk = napi.SecretKey.fromKeygen(Buffer.alloc(32, "*&@#"));
const skBytes = sk.toBytes();
const pk = sk.toPublicKey().toBytes();
const sig = sk.sign(Buffer.alloc(32, "*&@#")).toBytes();

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async function runMemoryTests() {
  await memoryTest(
    [
      {
        id: "Napi SecretKey",
        getInstance: () => napi.SecretKey.fromBytes(skBytes),
      },
      {
        id: "Napi PublicKey",
        getInstance: () => napi.PublicKey.fromBytes(pk),
      },
      {
        id: "Napi Signature",
        getInstance: () => napi.Signature.fromBytes(sig),
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
