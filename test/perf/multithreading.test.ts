import {itBench} from "@dapplion/benchmark";
import {expect} from "chai";
import {BlsMultiThreading, BlsPoolType, getGroupsOfBatchesOfSignatureSets} from "../utils";

describe("multithreading perf", function () {
  const minutes = 10;
  this.timeout(minutes * 60 * 1000);
  const getGroupsInfo = (isSwig: boolean): Parameters<typeof getGroupsOfBatchesOfSignatureSets> => [
    isSwig,
    16,
    128,
    256,
    256,
  ];

  describe("libuv", () => {
    let libuvPool: BlsMultiThreading;
    let napiGroups: ReturnType<typeof getGroupsOfBatchesOfSignatureSets>;
    before(async () => {
      libuvPool = new BlsMultiThreading({blsPoolType: BlsPoolType.libuv});
      console.log({libuvPoolSize: libuvPool.blsPoolSize});
      napiGroups = getGroupsOfBatchesOfSignatureSets(...getGroupsInfo(false));
    });
    after(async () => {
      await libuvPool.close();
    });
    itBench({
      id: "libuv multithreading - napi",
      timeoutBench: 120_000,
      fn: async () => {
        const responses = [] as Promise<boolean>[];
        for (const sets of napiGroups) {
          responses.push(libuvPool.verifySignatureSets(sets, {batchable: true}));
        }
        const results = await Promise.all(responses);
        expect(results.every((r) => r)).to.be.true;
      },
    });
  });

  describe("workers", () => {
    let workerPool: BlsMultiThreading;
    let swigGroups: ReturnType<typeof getGroupsOfBatchesOfSignatureSets>;
    before(async () => {
      workerPool = new BlsMultiThreading({blsPoolType: BlsPoolType.workers});
      await workerPool.waitTillInitialized();
      console.log({workerPoolSize: workerPool.blsPoolSize});
      swigGroups = getGroupsOfBatchesOfSignatureSets(...getGroupsInfo(true));
    });
    after(async () => {
      await workerPool.close();
    });
    itBench({
      id: "worker multithreading - swig",
      timeoutBench: 120_000,
      fn: async () => {
        const responses = [] as Promise<any>[];
        for (const sets of swigGroups) {
          responses.push(workerPool.verifySignatureSets(sets, {batchable: true}));
        }
        const results = await Promise.all(responses);
        expect(results.every((r) => r)).to.be.true;
      },
    });
  });
});
