import {itBench} from "@dapplion/benchmark";
import {BlsMultiThreading, BlsPoolType, getGroupsOfBatchesOfSignatureSets} from "../utils";

describe("multithreading perf", function () {
  this.timeout(20000);

  let libuvPool: BlsMultiThreading;
  let workerPool: BlsMultiThreading;
  let swigGroups: ReturnType<typeof getGroupsOfBatchesOfSignatureSets>;
  let napiGroups: ReturnType<typeof getGroupsOfBatchesOfSignatureSets>;
  before(async () => {
    workerPool = new BlsMultiThreading({blsPoolType: BlsPoolType.workers});
    await workerPool.waitTillInitialized();
    libuvPool = new BlsMultiThreading({blsPoolType: BlsPoolType.libuv});
    console.log({libuvPoolSize: libuvPool.blsPoolSize, workerPoolSize: workerPool.blsPoolSize});
    swigGroups = getGroupsOfBatchesOfSignatureSets(true, 12, 32, 16, 16);
    napiGroups = getGroupsOfBatchesOfSignatureSets(false, 12, 32, 16, 16);
  });
  after(async () => {
    await libuvPool.close();
    await workerPool.close();
  });

  itBench({
    id: "worker multithreading - swig",
    fn: async () => {
      const responses = [] as Promise<boolean>[];
      for (const sets of swigGroups) {
        responses.push(workerPool.verifySignatureSets(sets, {batchable: true}));
      }
      await Promise.all(responses);
    },
  });

  itBench({
    id: "libuv multithreading - napi",
    fn: async () => {
      const responses = [] as Promise<boolean>[];
      for (const sets of napiGroups) {
        responses.push(libuvPool.verifySignatureSets(sets, {batchable: true}));
      }
      await Promise.all(responses);
    },
  });
});
