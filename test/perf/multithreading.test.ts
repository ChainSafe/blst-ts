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

  let libuvPool: BlsMultiThreading;
  let workerPool: BlsMultiThreading;

  describe("libuv", () => {
    let napiGroups: ReturnType<typeof getGroupsOfBatchesOfSignatureSets>;
    before(async () => {
      libuvPool = new BlsMultiThreading({blsPoolType: BlsPoolType.libuv});
      napiGroups = getGroupsOfBatchesOfSignatureSets(...getGroupsInfo(false));
    });
    itBench({
      id: "libuv multithreading - napi",
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
    let swigGroups: ReturnType<typeof getGroupsOfBatchesOfSignatureSets>;
    before(async () => {
      workerPool = new BlsMultiThreading({blsPoolType: BlsPoolType.workers});
      await workerPool.waitTillInitialized();
      swigGroups = getGroupsOfBatchesOfSignatureSets(...getGroupsInfo(true));
    });
    after(async () => {
      await workerPool.close();
    });
    itBench({
      id: "worker multithreading - swig",
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

  after(async () => {
    console.log({
      libuvPoolSize: libuvPool.blsPoolSize,
      workerPoolSize: workerPool.blsPoolSize,
    });
    await libuvPool.close();
    await workerPool.close();
  });
});
