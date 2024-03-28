import {itBench} from "@dapplion/benchmark";
import {expect} from "chai";
import {BlsMultiThreading, getGroupsOfBatchesOfSignatureSets} from "../utils";

const minutes = 10;

for (const addVerificationRandomness of [true, false]) {
  describe(`multithreading perf - addVerificationRandomness ${addVerificationRandomness}`, function () {
    this.timeout(minutes * 60 * 1000);
    let libuvPool: BlsMultiThreading;
    let napiGroups: ReturnType<typeof getGroupsOfBatchesOfSignatureSets>;

    before(async () => {
      libuvPool = new BlsMultiThreading({addVerificationRandomness});
      napiGroups = getGroupsOfBatchesOfSignatureSets(16, 128, 256, 256);
    });

    itBench({
      id: `libuv multithreading - addVerificationRandomness ${addVerificationRandomness}`,
      fn: async () => {
        const responses = [] as Promise<boolean>[];
        for (const sets of napiGroups) {
          responses.push(libuvPool.verifySignatureSets(sets, {batchable: true}));
        }
        const results = await Promise.all(responses);
        expect(results.every((r) => r)).to.be.true;
      },
    });

    after(async () => {
      console.log({
        libuvPoolSize: libuvPool.blsPoolSize,
      });
      await libuvPool.close();
    });
  });
}
