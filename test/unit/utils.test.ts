import {expect} from "chai";
import {Signature, aggregateSignatures, fastAggregateVerify, verify, verifyMultipleAggregateSignatures} from "../../index.js";
import {
  BlsMultiThreading,
  arrayOfIndexes,
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
      expect(verify(set.msg, set.pk, set.sig)).to.be.true;
    });
  });
  describe("chunkifyMaximizeChunkSize", () => {
    const minPerChunk = 3;
    const testCases = [
      [[0]],
      [[0, 1]],
      [[0, 1, 2]],
      [[0, 1, 2, 3]],
      [[0, 1, 2, 3, 4]],
      [
        [0, 1, 2],
        [3, 4, 5],
      ],
      [
        [0, 1, 2, 3],
        [4, 5, 6],
      ],
      [
        [0, 1, 2, 3],
        [4, 5, 6, 7],
      ],
    ];

    for (const [i, testCase] of testCases.entries()) {
      it(`array len ${i + 1}`, () => {
        const arr = arrayOfIndexes(0, i);
        const chunks = chunkifyMaximizeChunkSize(arr, minPerChunk);
        expect(chunks).to.deep.equal(testCase);
      });
    }
  });
  describe("multithreading helpers", () => {
    it("should build napi same message sets", () => {
      const sets = getBatchesOfSameMessageSignatureSets(4, 2);
      expect(sets.length).to.equal(2);
      expect(sets[0].sets.length).to.equal(4);
      expectEqualHex(sets[0].message, sets[1].message);
      expect(
        verifyMultipleAggregateSignatures(
          sets[0].sets.map(({publicKey, signature}) => ({msg: sets[0].message, pk: publicKey, sig: signature}))
        )
      ).to.be.true;
      expect(
        verifyMultipleAggregateSignatures(
          sets[1].sets.map(({publicKey, signature}) => ({msg: sets[1].message, pk: publicKey, sig: signature}))
        )
      ).to.be.true;
    });
    it("should build aggregated signature sets", () => {
      const sameMessageSets = getBatchesOfSameMessageSignatureSets(4, 2);
      const aggregatedSigSets = getBatchesOfAggregatedSignatureSets(4, 2);
      expect(aggregatedSigSets.length).to.equal(2);
      expect(aggregatedSigSets[0].pubkeys.length).to.equal(4);
      const aggregated = aggregateSignatures(sameMessageSets[0].sets.map(({signature}) => signature));
      expectEqualHex(aggregatedSigSets[0].signature, aggregated);
      for (const set of aggregatedSigSets) {
        expect(fastAggregateVerify(set.signingRoot, set.pubkeys, Signature.fromBytes(set.signature))).to.be.true;
      }
    });
    it("should build batches of single signature sets", () => {
      const singleSets = getBatchesOfSingleSignatureSets(4);
      expect(singleSets.length).to.equal(4);
      for (const set of singleSets) {
        expect(verify(set.signingRoot, set.pubkey, Signature.fromBytes(set.signature))).to.be.true;
      }
    });
    it("should build groups correctly", () => {
      const batchesGroups = getGroupsOfBatchesOfSingleSignatureSets(2, 4);
      expect(batchesGroups.length).to.equal(4);
      expect(batchesGroups[0].length).to.equal(2);
      const singleGroups = getGroupsOfBatchesOfAggregatedSignatureSets(2, 4, 6);
      expect(singleGroups.length).to.equal(6);
      expect(singleGroups[0].length).to.equal(4);
      expect(singleGroups[0][0].pubkeys.length).to.equal(2);
    });
  });
  describe("multithreading verification", function () {
    this.timeout(20 * 1000);
    let libuvPool: BlsMultiThreading;
    let napiGroups: ReturnType<typeof getGroupsOfBatchesOfSignatureSets>;
    before(() => {
      libuvPool = new BlsMultiThreading({});
      napiGroups = getGroupsOfBatchesOfSignatureSets(12, 32, 4, 4);
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
