import {expect} from "chai";
import {asyncVerifyMultipleAggregateSignatures, verifyMultipleAggregateSignatures} from "../../rebuild/lib";
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
  describe("asyncVerifyMultipleAggregateSignatures", () => {
    it("should return Promise<boolean>", async () => {
      const resPromise = asyncVerifyMultipleAggregateSignatures([]);
      expect(resPromise).to.be.instanceOf(Promise);
      const res = await resPromise;
      expect(res).to.be.a("boolean");
    });
    it("should default to Promise<false>", async () => {
      expect(await asyncVerifyMultipleAggregateSignatures([])).to.be.false;
    });
    it("should return true for valid sets", async () => {
      expect(await asyncVerifyMultipleAggregateSignatures(getTestSets(6))).to.be.true;
    });
  });
});
