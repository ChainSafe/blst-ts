import {expect} from "chai";
import {verify, verifySync} from "../../lib";
import {sullyUint8Array, makeNapiTestSets} from "../utils";
import {NapiTestSet} from "../types";

describe("Verify", () => {
  let testSet: NapiTestSet;
  before(() => {
    testSet = makeNapiTestSets(1)[0];
  });
  describe("verifySync", () => {
    it("should return a boolean", () => {
      expect(verifySync(testSet.msg, testSet.publicKey, testSet.signature)).to.be.a("boolean");
    });
    it("should default to false", () => {
      expect(verifySync(sullyUint8Array(testSet.msg), testSet.publicKey, testSet.signature)).to.be.false;
      expect(verifySync(testSet.msg, sullyUint8Array(testSet.publicKey.serialize()), testSet.signature)).to.be.false;
      expect(verifySync(testSet.msg, testSet.publicKey, sullyUint8Array(testSet.signature.serialize()))).to.be.false;
    });
    it("should return true for valid sets", () => {
      expect(verifySync(testSet.msg, testSet.publicKey, testSet.signature)).to.be.true;
    });
  });
  describe("verify", () => {
    it("should return Promise<boolean>", async () => {
      const resPromise = verify(testSet.msg, testSet.publicKey, testSet.signature);
      expect(resPromise).to.be.instanceOf(Promise);
      const res = await resPromise;
      expect(res).to.be.a("boolean");
    });
    it("should default to Promise<false>", async () => {
      expect(await verify(sullyUint8Array(testSet.msg), testSet.publicKey, testSet.signature)).to.be.false;
      expect(await verify(testSet.msg, sullyUint8Array(testSet.publicKey.serialize()), testSet.signature)).to.be.false;
      expect(await verify(testSet.msg, testSet.publicKey, sullyUint8Array(testSet.signature.serialize()))).to.be.false;
    });
    it("should return true for valid sets", async () => {
      expect(await verify(testSet.msg, testSet.publicKey, testSet.signature)).to.be.true;
    });
  });
});
