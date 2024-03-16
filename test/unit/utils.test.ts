import {expect} from "chai";
import {aggregateSignatures, fastAggregateVerify, verify, verifyMultipleAggregateSignatures} from "../../lib";
import {
  BlsMultiThreading,
  BlsPoolType,
  chunkifyMaximizeChunkSize,
  expectEqualHex,
  getBatchesOfAggregatedSignatureSets,
  getBatchesOfSameMessageSignatureSets,
  getBatchesOfSingleSignatureSets,
  getGroupsOfBatchesOfAggregatedSignatureSets,
  getGroupsOfBatchesOfSignatureSets,
  getGroupsOfBatchesOfSingleSignatureSets,
  getTestSet,
} from "../utils";

describe("utils", () => {
  describe("helpers", () => {
    it("should build valid test sets", () => {
      const set = getTestSet();
      expect(verify(set.message, set.publicKey, set.signature)).to.be.true;
    });
  });
  describe("chunkify", () => {
    const arr = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15];

    const results = {
      0: [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15]],
      1: [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15]],
      2: [
        [0, 1, 2, 3, 4, 5, 6, 7],
        [8, 9, 10, 12, 13, 14, 15],
      ],
      3: [
        [0, 1, 2, 3, 4],
        [5, 6, 7, 8, 9],
        [10, 12, 13, 14, 15],
      ],
      4: [
        [0, 1, 2, 3],
        [4, 5, 6, 7],
        [8, 9, 10, 12],
        [13, 14, 15],
      ],
      5: [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [9, 10, 12],
        [13, 14, 15],
      ],
      6: [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [9, 10, 12],
        [13, 14, 15],
      ],
      7: [[0, 1], [2, 3], [4, 5], [6, 7], [8, 9], [10, 12], [13, 14], [15]],
      8: [[0, 1], [2, 3], [4, 5], [6, 7], [8, 9], [10, 12], [13, 14], [15]],
    };

    const testCases: {
      id: string;
      n: number;
      arr: number[];
      expectArr: number[][];
    }[] = Object.entries(results).map(([i, expectArr]) => ({
      id: i,
      n: parseInt(i),
      arr,
      expectArr,
    }));

    for (const {id, arr, n, expectArr} of testCases) {
      it(id, () => {
        expect(chunkifyMaximizeChunkSize(arr, n)).to.deep.equal(expectArr);
      });
    }
  });
  describe("multithreading helpers", () => {
    it("should build napi same message sets", () => {
      const sets = getBatchesOfSameMessageSignatureSets(false, 4, 2);
      expect(sets.length).to.equal(2);
      expect(sets[0].sets.length).to.equal(4);
      expectEqualHex(sets[0].message, sets[1].message);
      expect(
        verifyMultipleAggregateSignatures(
          sets[0].sets.map(({publicKey, signature}) => ({message: sets[0].message, publicKey, signature}))
        )
      ).to.be.true;
      expect(
        verifyMultipleAggregateSignatures(
          sets[1].sets.map(({publicKey, signature}) => ({message: sets[1].message, publicKey, signature}))
        )
      ).to.be.true;
    });
    it("should build aggregated signature sets", () => {
      const sameMessageSets = getBatchesOfSameMessageSignatureSets(false, 4, 2);
      const aggregatedSigSets = getBatchesOfAggregatedSignatureSets(false, 4, 2);
      expect(aggregatedSigSets.length).to.equal(2);
      expect(aggregatedSigSets[0].pubkeys.length).to.equal(4);
      const aggregated = aggregateSignatures(sameMessageSets[0].sets.map(({signature}) => signature));
      expectEqualHex(aggregatedSigSets[0].signature, aggregated);
      for (const set of aggregatedSigSets) {
        expect(fastAggregateVerify(set.signingRoot, set.pubkeys, set.signature)).to.be.true;
      }
    });
    it("should build batches of single signature sets", () => {
      const singleSets = getBatchesOfSingleSignatureSets(false, 4);
      expect(singleSets.length).to.equal(4);
      for (const set of singleSets) {
        expect(verify(set.signingRoot, set.pubkey, set.signature)).to.be.true;
      }
    });
    it("should build groups correctly", () => {
      const batchesGroups = getGroupsOfBatchesOfSingleSignatureSets(true, 2, 4);
      expect(batchesGroups.length).to.equal(4);
      expect(batchesGroups[0].length).to.equal(2);
      const singleGroups = getGroupsOfBatchesOfAggregatedSignatureSets(true, 2, 4, 6);
      expect(singleGroups.length).to.equal(6);
      expect(singleGroups[0].length).to.equal(4);
      expect(singleGroups[0][0].pubkeys.length).to.equal(2);
    });
  });
  describe("multithreading verification", () => {
    let libuvPool: BlsMultiThreading;
    let napiGroups: ReturnType<typeof getGroupsOfBatchesOfSignatureSets>;
    before(() => {
      libuvPool = new BlsMultiThreading({blsPoolType: BlsPoolType.libuv});
      napiGroups = getGroupsOfBatchesOfSignatureSets(false, 12, 32, 4, 4);
    });
    after(async () => {
      await libuvPool.close();
    });
    it("should verify one test set", async () => {
      const response = await libuvPool.verifySignatureSets(napiGroups[0], {batchable: true});
      expect(response).to.be.true;
    });
    it("should verify multiple test sets", async () => {
      const responses = [] as Promise<boolean>[];
      for (const sets of napiGroups) {
        responses.push(libuvPool.verifySignatureSets(sets, {batchable: true}));
      }
      const results = await Promise.all(responses);
      expect(results.every((r) => r)).to.be.true;
    });
  });
});
