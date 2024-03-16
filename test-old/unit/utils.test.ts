import {expect} from "chai";
import * as swig from "../../src";
import * as napi from "../../lib";

import {
  BlsMultiThreading,
  BlsPoolType,
  expectHex,
  getBatchesOfAggregatedSignatureSets,
  getBatchesOfSameMessageSignatureSets,
  getBatchesOfSingleSignatureSets,
  getGroupsOfBatchesOfAggregatedSignatureSets,
  getGroupsOfBatchesOfSignatureSets,
  getGroupsOfBatchesOfSingleSignatureSets,
  getNapiSet,
  getSwigSet,
} from "../utils";

describe("utils", () => {
  describe("helpers", () => {
    it("should build valid swig sets", () => {
      const set = getSwigSet(0);
      expect(swig.verify(set.msg, set.pk, set.sig)).to.be.true;
    });
    it("should build valid napi sets", () => {
      const set = getNapiSet(0);
      expect(napi.verify(set.message, set.publicKey, set.signature)).to.be.true;
    });
    it("should throw for napi sets passed into swig verify", () => {
      const set = getNapiSet(0);
      expect(() => swig.verify(set.message, (set as any).publicKey, (set as any).signature)).to.throw(
        "Illegal arguments for function aggregate."
      );
    });
    it("should throw for swig sets passed into napi verify", () => {
      const set = getSwigSet(0);
      expect(napi.verify(set.msg, (set as any).pk, (set as any).sig)).to.be.false;
    });
  });
  describe("multithreading helpers", () => {
    it("should build napi same message sets", () => {
      const sets = getBatchesOfSameMessageSignatureSets(false, 4, 2);
      expect(sets.length).to.equal(2);
      expect(sets[0].sets.length).to.equal(4);
      expectHex(sets[0].message, sets[1].message);
      expect(
        napi.verifyMultipleAggregateSignatures(
          sets[0].sets.map(({publicKey, signature}) => ({message: sets[0].message, publicKey, signature}))
        )
      ).to.be.true;
      expect(
        napi.verifyMultipleAggregateSignatures(
          sets[1].sets.map(({publicKey, signature}) => ({message: sets[1].message, publicKey, signature}))
        )
      ).to.be.true;
    });
    it("should build swig same message sets", () => {
      const sets = getBatchesOfSameMessageSignatureSets(true, 4, 2);
      expect(sets.length).to.equal(2);
      expectHex(sets[0].message, sets[1].message);
      expect(
        swig.verifyMultipleAggregateSignatures(
          sets[0].sets.map(({publicKey, signature}) => ({msg: sets[0].message, pk: publicKey, sig: signature}))
        )
      ).to.be.true;
      expect(
        swig.verifyMultipleAggregateSignatures(
          sets[1].sets.map(({publicKey, signature}) => ({msg: sets[1].message, pk: publicKey, sig: signature}))
        )
      ).to.be.true;
    });
    it("should build napi aggregated signature sets", () => {
      const sameMessageSets = getBatchesOfSameMessageSignatureSets(false, 4, 2);
      const aggregatedSigSets = getBatchesOfAggregatedSignatureSets(false, 4, 2);
      expect(aggregatedSigSets.length).to.equal(2);
      expect(aggregatedSigSets[0].pubkeys.length).to.equal(4);
      const aggregated = napi.aggregateSignatures(sameMessageSets[0].sets.map(({signature}) => signature));
      expectHex(aggregatedSigSets[0].signature, aggregated);
      for (const set of aggregatedSigSets) {
        expect(napi.fastAggregateVerify(set.signingRoot, set.pubkeys, set.signature)).to.be.true;
      }
    });
    it("should build swig aggregated signature sets", () => {
      const sameMessageSets = getBatchesOfSameMessageSignatureSets(true, 4, 2);
      const aggregatedSigSets = getBatchesOfAggregatedSignatureSets(true, 4, 2);
      expect(aggregatedSigSets.length).to.equal(2);
      expect(aggregatedSigSets[0].pubkeys.length).to.equal(4);
      const aggregated = swig.aggregateSignatures(sameMessageSets[0].sets.map(({signature}) => signature));
      expectHex(aggregatedSigSets[0].signature, aggregated.toBytes());
      for (const set of aggregatedSigSets) {
        expect(swig.fastAggregateVerify(set.signingRoot, set.pubkeys, swig.Signature.fromBytes(set.signature))).to.be
          .true;
      }
    });
    it("should build napi single signature sets", () => {
      const singleSets = getBatchesOfSingleSignatureSets(false, 4);
      expect(singleSets.length).to.equal(4);
      for (const set of singleSets) {
        expect(napi.verify(set.signingRoot, set.pubkey, set.signature)).to.be.true;
      }
    });
    it("should build swig single signature sets", () => {
      const singleSets = getBatchesOfSingleSignatureSets(true, 4);
      expect(singleSets.length).to.equal(4);
      for (const set of singleSets) {
        expect(swig.verify(set.signingRoot, set.pubkey, swig.Signature.fromBytes(set.signature))).to.be.true;
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
  describe("multithreading verify napi set", () => {
    let libuvPool: BlsMultiThreading;
    let napiGroups: ReturnType<typeof getGroupsOfBatchesOfSignatureSets>;
    before(() => {
      libuvPool = new BlsMultiThreading({blsPoolType: BlsPoolType.libuv});
      napiGroups = getGroupsOfBatchesOfSignatureSets(false, 12, 32, 4, 4);
    });
    after(async () => {
      await libuvPool.close();
    });
    it("should verify napi sets", async () => {
      const response = await libuvPool.verifySignatureSets(napiGroups[0], {batchable: true});
      expect(response).to.be.true;
    });
    it("should verify multiple napi sets", async () => {
      const responses = [] as Promise<boolean>[];
      for (const sets of napiGroups) {
        responses.push(libuvPool.verifySignatureSets(sets, {batchable: true}));
      }
      const results = await Promise.all(responses);
      expect(results.every((r) => r)).to.be.true;
    });
  });
  describe("multithreading verify swig set", function () {
    this.timeout(60000);
    let workerPool: BlsMultiThreading;
    let swigGroups: ReturnType<typeof getGroupsOfBatchesOfSignatureSets>;
    before(async () => {
      workerPool = new BlsMultiThreading({blsPoolType: BlsPoolType.workers});
      await workerPool.waitTillInitialized();
      swigGroups = getGroupsOfBatchesOfSignatureSets(true, 12, 32, 4, 4);
    });
    after(async () => {
      await workerPool.close();
    });
    it("should verify a single swig set", async () => {
      const response = await workerPool.verifySignatureSets(swigGroups[0], {batchable: true});
      expect(response).to.be.true;
    });
    it("should verify multiple swig sets", async () => {
      const responses = [] as Promise<boolean>[];
      for (const sets of swigGroups) {
        responses.push(workerPool.verifySignatureSets(sets, {batchable: true}));
      }
      const results = await Promise.all(responses);
      expect(results.every((r) => r)).to.be.true;
    });
  });
});
