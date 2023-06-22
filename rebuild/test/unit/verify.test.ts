import {expect} from "chai";
import {aggregateVerify, fastAggregateVerify, verify} from "../../lib";
import {sullyUint8Array, makeNapiTestSets} from "../utils";
import {NapiTestSet} from "../types";

describe("Verify", () => {
  let testSet: NapiTestSet;
  before(() => {
    testSet = makeNapiTestSets(1)[0];
  });
  describe("verify", () => {
    it("should return a boolean", () => {
      expect(verify(testSet.msg, testSet.publicKey, testSet.signature)).to.be.a("boolean");
    });
    it("should default to false", () => {
      expect(verify(sullyUint8Array(testSet.msg), testSet.publicKey, testSet.signature)).to.be.false;
      expect(verify(testSet.msg, sullyUint8Array(testSet.publicKey.serialize()), testSet.signature)).to.be.false;
      expect(verify(testSet.msg, testSet.publicKey, sullyUint8Array(testSet.signature.serialize()))).to.be.false;
    });
    it("should return true for valid sets", () => {
      expect(verify(testSet.msg, testSet.publicKey, testSet.signature)).to.be.true;
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
      expect(aggregateVerify([testSet.msg], [testSet.publicKey], testSet.signature)).to.be.a("boolean");
    });
    it("should default to false", () => {
      expect(aggregateVerify([sullyUint8Array(testSet.msg)], [testSet.publicKey], testSet.signature)).to.be.false;
      expect(aggregateVerify([testSet.msg], [sullyUint8Array(testSet.publicKey.serialize())], testSet.signature)).to.be
        .false;
      expect(aggregateVerify([testSet.msg], [testSet.publicKey], sullyUint8Array(testSet.signature.serialize()))).to.be
        .false;
    });
    it("should return true for valid sets", () => {
      expect(aggregateVerify([testSet.msg], [testSet.publicKey], testSet.signature)).to.be.true;
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
      expect(fastAggregateVerify(testSet.msg, [testSet.publicKey], testSet.signature)).to.be.a("boolean");
    });
    it("should default to false", () => {
      expect(fastAggregateVerify(sullyUint8Array(testSet.msg), [testSet.publicKey], testSet.signature)).to.be.false;
      expect(fastAggregateVerify(testSet.msg, [sullyUint8Array(testSet.publicKey.serialize())], testSet.signature)).to
        .be.false;
      expect(fastAggregateVerify(testSet.msg, [testSet.publicKey], sullyUint8Array(testSet.signature.serialize()))).to
        .be.false;
    });
    it("should return true for valid sets", () => {
      expect(fastAggregateVerify(testSet.msg, [testSet.publicKey], testSet.signature)).to.be.true;
    });
  });
});
