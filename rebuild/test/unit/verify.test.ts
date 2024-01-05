import {expect} from "chai";
import {
  aggregateVerify,
  asyncAggregateVerify,
  asyncFastAggregateVerify,
  asyncVerify,
  fastAggregateVerify,
  verify,
} from "../../lib/index.js";
import {sullyUint8Array, makeNapiTestSets} from "../utils.js";
import {NapiTestSet} from "../types.js";

describe("Verify", () => {
  let testSet: NapiTestSet;
  before(() => {
    testSet = makeNapiTestSets(1)[0];
  });
  describe("verify", () => {
    it("should return a boolean", () => {
      expect(verify(testSet.message, testSet.publicKey, testSet.signature)).to.be.a("boolean");
    });
    it("should default to false", () => {
      expect(verify(sullyUint8Array(testSet.message), testSet.publicKey, testSet.signature)).to.be.false;
      expect(verify(testSet.message, sullyUint8Array(testSet.publicKey.serialize()), testSet.signature)).to.be.false;
      expect(verify(testSet.message, testSet.publicKey, sullyUint8Array(testSet.signature.serialize()))).to.be.false;
    });
    it("should return true for valid sets", () => {
      expect(verify(testSet.message, testSet.publicKey, testSet.signature)).to.be.true;
    });
  });
  describe("asyncVerify", () => {
    it("should return Promise<boolean>", async () => {
      const resPromise = asyncVerify(testSet.message, testSet.publicKey, testSet.signature);
      expect(resPromise).to.be.instanceOf(Promise);
      const res = await resPromise;
      expect(res).to.be.a("boolean");
    });
    it("should default to Promise<false>", async () => {
      expect(await asyncVerify(sullyUint8Array(testSet.message), testSet.publicKey, testSet.signature)).to.be.false;
      expect(await asyncVerify(testSet.message, sullyUint8Array(testSet.publicKey.serialize()), testSet.signature)).to
        .be.false;
      expect(await asyncVerify(testSet.message, testSet.publicKey, sullyUint8Array(testSet.signature.serialize()))).to
        .be.false;
    });
    it("should return true for valid sets", async () => {
      expect(await asyncVerify(testSet.message, testSet.publicKey, testSet.signature)).to.be.true;
    });
  });
});

describe("Aggregate Verify", () => {
  let testSet: NapiTestSet;
  before(() => {
    testSet = makeNapiTestSets(1)[0];
  });
  describe("aggregateVerify", () => {
    it("should return a boolean", () => {
      expect(aggregateVerify([testSet.message], [testSet.publicKey], testSet.signature)).to.be.a("boolean");
    });
    it("should default to false", () => {
      expect(aggregateVerify([sullyUint8Array(testSet.message)], [testSet.publicKey], testSet.signature)).to.be.false;
      expect(aggregateVerify([testSet.message], [sullyUint8Array(testSet.publicKey.serialize())], testSet.signature)).to
        .be.false;
      expect(aggregateVerify([testSet.message], [testSet.publicKey], sullyUint8Array(testSet.signature.serialize()))).to
        .be.false;
    });
    it("should return true for valid sets", () => {
      expect(aggregateVerify([testSet.message], [testSet.publicKey], testSet.signature)).to.be.true;
    });
  });
  describe("asyncAggregateVerify", () => {
    it("should return Promise<boolean>", async () => {
      const resPromise = asyncAggregateVerify([testSet.message], [testSet.publicKey], testSet.signature);
      expect(resPromise).to.be.instanceOf(Promise);
      const res = await resPromise;
      expect(res).to.be.a("boolean");
    });
    it("should default to Promise<false>", async () => {
      expect(await asyncAggregateVerify([sullyUint8Array(testSet.message)], [testSet.publicKey], testSet.signature)).to
        .be.false;
      expect(
        await asyncAggregateVerify(
          [testSet.message],
          [sullyUint8Array(testSet.publicKey.serialize())],
          testSet.signature
        )
      ).to.be.false;
      expect(
        await asyncAggregateVerify(
          [testSet.message],
          [testSet.publicKey],
          sullyUint8Array(testSet.signature.serialize())
        )
      ).to.be.false;
    });
    it("should return true for valid sets", async () => {
      expect(await asyncAggregateVerify([testSet.message], [testSet.publicKey], testSet.signature)).to.be.true;
    });
  });
});

describe("Fast Aggregate Verify", () => {
  let testSet: NapiTestSet;
  before(() => {
    testSet = makeNapiTestSets(1)[0];
  });
  describe("fastAggregateVerify", () => {
    it("should return a boolean", () => {
      expect(fastAggregateVerify(testSet.message, [testSet.publicKey], testSet.signature)).to.be.a("boolean");
    });
    it("should default to false", () => {
      expect(fastAggregateVerify(sullyUint8Array(testSet.message), [testSet.publicKey], testSet.signature)).to.be.false;
      expect(fastAggregateVerify(testSet.message, [sullyUint8Array(testSet.publicKey.serialize())], testSet.signature))
        .to.be.false;
      expect(fastAggregateVerify(testSet.message, [testSet.publicKey], sullyUint8Array(testSet.signature.serialize())))
        .to.be.false;
    });
    it("should return true for valid sets", () => {
      expect(fastAggregateVerify(testSet.message, [testSet.publicKey], testSet.signature)).to.be.true;
    });
  });
  describe("asyncFastAggregateVerify", () => {
    it("should return Promise<boolean>", async () => {
      const resPromise = asyncFastAggregateVerify(testSet.message, [testSet.publicKey], testSet.signature);
      expect(resPromise).to.be.instanceOf(Promise);
      const res = await resPromise;
      expect(res).to.be.a("boolean");
    });
    it("should default to Promise<false>", async () => {
      expect(await asyncFastAggregateVerify(sullyUint8Array(testSet.message), [testSet.publicKey], testSet.signature))
        .to.be.false;
      expect(
        await asyncFastAggregateVerify(
          testSet.message,
          [sullyUint8Array(testSet.publicKey.serialize())],
          testSet.signature
        )
      ).to.be.false;
      expect(
        await asyncFastAggregateVerify(
          testSet.message,
          [testSet.publicKey],
          sullyUint8Array(testSet.signature.serialize())
        )
      ).to.be.false;
    });
    it("should return true for valid sets", async () => {
      expect(await asyncFastAggregateVerify(testSet.message, [testSet.publicKey], testSet.signature)).to.be.true;
    });
  });
});
