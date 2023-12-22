import {itBench} from "@dapplion/benchmark";
import {BlsMultiThreadWorkerPool, BlsPoolType, getGroupsOfSignatureSets} from "../utils";

describe("multithreading perf", () => {
  let libuvPool: BlsMultiThreadWorkerPool;
  let workerPool: BlsMultiThreadWorkerPool;
  before(() => {
    workerPool = new BlsMultiThreadWorkerPool({blsPoolType: BlsPoolType.workers});
    libuvPool = new BlsMultiThreadWorkerPool({blsPoolType: BlsPoolType.libuv});
  });
  after(async () => {
    await libuvPool.close();
    await workerPool.close();
  });

  itBench({
    id: "worker multithreading - swig",
    beforeEach: () => {
      return getGroupsOfSignatureSets(true, 12, 4, 4, 2);
    },
    fn: async (groups) => {
      const responses = [] as Promise<boolean>[];
      for (const sets of groups) {
        responses.push(workerPool.verifySignatureSets(sets, {batchable: true}));
      }
      await Promise.all(responses);
    },
  });

  itBench({
    id: "libuv multithreading - napi",
    beforeEach: () => {
      return getGroupsOfSignatureSets(false, 16, 128, 128, 4);
    },
    fn: async (groups) => {
      const responses = [] as Promise<boolean>[];
      for (const sets of groups) {
        responses.push(libuvPool.verifySignatureSets(sets, {batchable: true}));
      }
      await Promise.all(responses);
    },
  });
});
