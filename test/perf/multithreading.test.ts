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
    let blsPool: BlsMultiThreading;
    let signatureGroups: ReturnType<typeof getGroupsOfBatchesOfSignatureSets>;

    before(async () => {
      blsPool = new BlsMultiThreading({blsPoolType: BlsPoolType.libuv, addVerificationRandomness});
      signatureGroups = getGroupsOfBatchesOfSignatureSets(...getGroupsInfo(false));
    });

    itBench({
      id: `libuv multithreading - addVerificationRandomness ${addVerificationRandomness}`,
      fn: async () => {
        const responses = [] as Promise<boolean>[];
        for (const sets of signatureGroups) {
          responses.push(blsPool.verifySignatureSets(sets, {batchable: true}));
        }
        const results = await Promise.all(responses);
        expect(results.every((r) => r)).to.be.true;
      },
    });

    after(async () => {
      console.log({
        blsPoolSize: blsPool.blsPoolSize,
      });
      await blsPool.close();
    });
  });
}
