import {itBench} from "@dapplion/benchmark";
import {expect} from "chai";
import {BlsMultiThreading, BlsPoolType, getGroupsOfBatchesOfSignatureSets} from "../utils";

const minutes = 10;
const getGroupsInfo = (isSwig: boolean): Parameters<typeof getGroupsOfBatchesOfSignatureSets> => [
  isSwig,
  16,
  128,
  256,
  256,
];

for (const addVerificationRandomness of [true, false]) {
  describe.only(`multithreading perf - addVerificationRandomness ${addVerificationRandomness}`, function () {
    this.timeout(minutes * 60 * 1000);
    let libuvPool: BlsMultiThreading;
    let workerPool: BlsMultiThreading;
    let napiGroups: ReturnType<typeof getGroupsOfBatchesOfSignatureSets>;
    let swigGroups: ReturnType<typeof getGroupsOfBatchesOfSignatureSets>;

    before(async () => {
      libuvPool = new BlsMultiThreading({blsPoolType: BlsPoolType.libuv, addVerificationRandomness});
      napiGroups = getGroupsOfBatchesOfSignatureSets(...getGroupsInfo(false));

      workerPool = new BlsMultiThreading({blsPoolType: BlsPoolType.workers, addVerificationRandomness});
      await workerPool.waitTillInitialized();
      swigGroups = getGroupsOfBatchesOfSignatureSets(...getGroupsInfo(true));
    });

    itBench({
      id: `libuv multithreading - napi - addVerificationRandomness ${addVerificationRandomness}`,
      fn: async () => {
        const responses = [] as Promise<boolean>[];
        for (const sets of napiGroups) {
          responses.push(libuvPool.verifySignatureSets(sets, {batchable: true}));
        }
        const results = await Promise.all(responses);
        expect(results.every((r) => r)).to.be.true;
      },
    });

    itBench({
      id: `worker multithreading - swig - addVerificationRandomness ${addVerificationRandomness}`,
      fn: async () => {
        const responses = [] as Promise<any>[];
        for (const sets of swigGroups) {
          responses.push(workerPool.verifySignatureSets(sets, {batchable: true}));
        }
        const results = await Promise.all(responses);
        expect(results.every((r) => r)).to.be.true;
      },
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
}
