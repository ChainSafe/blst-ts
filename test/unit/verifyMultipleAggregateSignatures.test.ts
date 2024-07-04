import {expect} from "chai";
import {verifyMultipleAggregateSignatures} from "../../index.js";
import {getTestSets} from "../utils";

describe("Verify Multiple Aggregate Signatures", () => {
  describe("verifyMultipleAggregateSignatures", () => {
    it("should return a boolean", () => {
      expect(verifyMultipleAggregateSignatures([])).to.be.a("boolean");
    });
    it("should default to false", () => {
      expect(verifyMultipleAggregateSignatures([])).to.be.false;
    });
    it("should return true for valid sets", () => {
      expect(verifyMultipleAggregateSignatures(getTestSets(6))).to.be.true;
    });
  });
});
