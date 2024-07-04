import {expect} from "chai";
import {aggregateVerify, fastAggregateVerify, verify} from "../../index.js";
import {sullyUint8Array, getTestSet} from "../utils";
import {TestSet} from "../utils/types";

describe("Verify", () => {
  let testSet: TestSet;
  before(() => {
    testSet = getTestSet();
  });
  describe("verify", () => {
    it("should return a boolean", () => {
      expect(verify(testSet.msg, testSet.pk, testSet.sig)).to.be.a("boolean");
    });
    describe("should default to false", () => {
      it("should handle invalid message", () => {
        expect(verify(sullyUint8Array(testSet.msg), testSet.pk, testSet.sig)).to.be.false;
      });
    });
    it("should return true for valid sets", () => {
      expect(verify(testSet.msg, testSet.pk, testSet.sig)).to.be.true;
    });
  });
});

describe("Aggregate Verify", () => {
  let testSet: TestSet;
  before(() => {
    testSet = getTestSet();
  });
  describe("aggregateVerify", () => {
    it("should return a boolean", () => {
      expect(aggregateVerify([testSet.msg], [testSet.pk], testSet.sig)).to.be.a("boolean");
    });
    describe("should default to false", () => {
      it("should handle invalid message", () => {
        expect(aggregateVerify([sullyUint8Array(testSet.msg)], [testSet.pk], testSet.sig)).to.be.false;
      });
    });
    it("should return true for valid sets", () => {
      expect(aggregateVerify([testSet.msg], [testSet.pk], testSet.sig)).to.be.true;
    });
  });
});

describe("Fast Aggregate Verify", () => {
  let testSet: TestSet;
  before(() => {
    testSet = getTestSet();
  });
  describe("fastAggregateVerify", () => {
    it("should return a boolean", () => {
      expect(fastAggregateVerify(testSet.msg, [testSet.pk], testSet.sig)).to.be.a("boolean");
    });
    describe("should default to false", () => {
      it("should handle invalid message", () => {
        expect(fastAggregateVerify(sullyUint8Array(testSet.msg), [testSet.pk], testSet.sig)).to.be.false;
      });
    });
    it("should return true for valid sets", () => {
      expect(fastAggregateVerify(testSet.msg, [testSet.pk], testSet.sig)).to.be.true;
    });
  });
});
