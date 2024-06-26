import {expect} from "chai";
import {
  aggregateVerify,
  asyncAggregateVerify,
  asyncFastAggregateVerify,
  asyncVerify,
  fastAggregateVerify,
  verify,
} from "../../lib";
import {sullyUint8Array, getTestSet} from "../utils";
import {TestSet} from "../utils/types";

describe("Verify", () => {
  let testSet: TestSet;
  before(() => {
    testSet = getTestSet();
  });
  describe("verify", () => {
    it("should return a boolean", () => {
      expect(verify(testSet.message, testSet.publicKey, testSet.signature)).to.be.a("boolean");
    });
    describe("should default to false", () => {
      it("should handle invalid message", () => {
        expect(verify(sullyUint8Array(testSet.message), testSet.publicKey, testSet.signature)).to.be.false;
      });
      it("should handle invalid publicKey", () => {
        expect(verify(testSet.message, sullyUint8Array(testSet.publicKey.serialize()), testSet.signature)).to.be.false;
      });
      it("should handle invalid signature", () => {
        expect(verify(testSet.message, testSet.publicKey, sullyUint8Array(testSet.signature.serialize()))).to.be.false;
      });
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
    describe("should default to Promise<false>", () => {
      it("should handle invalid message", async () => {
        expect(await asyncVerify(sullyUint8Array(testSet.message), testSet.publicKey, testSet.signature)).to.be.false;
      });
      it("should handle invalid publicKey", async () => {
        expect(await asyncVerify(testSet.message, sullyUint8Array(testSet.publicKey.serialize()), testSet.signature)).to
          .be.false;
      });
      it("should handle invalid signature", async () => {
        expect(await asyncVerify(testSet.message, testSet.publicKey, sullyUint8Array(testSet.signature.serialize()))).to
          .be.false;
      });
    });
    it("should return true for valid sets", async () => {
      expect(await asyncVerify(testSet.message, testSet.publicKey, testSet.signature)).to.be.true;
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
      expect(aggregateVerify([testSet.message], [testSet.publicKey], testSet.signature)).to.be.a("boolean");
    });
    describe("should default to false", () => {
      it("should handle invalid message", () => {
        expect(aggregateVerify([sullyUint8Array(testSet.message)], [testSet.publicKey], testSet.signature)).to.be.false;
      });
      it("should handle invalid publicKey", () => {
        expect(aggregateVerify([testSet.message], [sullyUint8Array(testSet.publicKey.serialize())], testSet.signature))
          .to.be.false;
      });
      it("should handle invalid signature", () => {
        expect(aggregateVerify([testSet.message], [testSet.publicKey], sullyUint8Array(testSet.signature.serialize())))
          .to.be.false;
      });
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
    describe("should default to Promise<false>", () => {
      it("should handle invalid message", async () => {
        expect(await asyncAggregateVerify([sullyUint8Array(testSet.message)], [testSet.publicKey], testSet.signature))
          .to.be.false;
      });
      it("should handle invalid publicKey", async () => {
        expect(
          await asyncAggregateVerify(
            [testSet.message],
            [sullyUint8Array(testSet.publicKey.serialize())],
            testSet.signature
          )
        ).to.be.false;
      });
      it("should handle invalid signature", async () => {
        expect(
          await asyncAggregateVerify(
            [testSet.message],
            [testSet.publicKey],
            sullyUint8Array(testSet.signature.serialize())
          )
        ).to.be.false;
      });
    });
    it("should return true for valid sets", async () => {
      expect(await asyncAggregateVerify([testSet.message], [testSet.publicKey], testSet.signature)).to.be.true;
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
      expect(fastAggregateVerify(testSet.message, [testSet.publicKey], testSet.signature)).to.be.a("boolean");
    });
    describe("should default to false", () => {
      it("should handle invalid message", () => {
        expect(fastAggregateVerify(sullyUint8Array(testSet.message), [testSet.publicKey], testSet.signature)).to.be
          .false;
      });
      it("should handle invalid publicKey", () => {
        expect(
          fastAggregateVerify(testSet.message, [sullyUint8Array(testSet.publicKey.serialize())], testSet.signature)
        ).to.be.false;
      });
      it("should handle invalid signature", () => {
        expect(
          fastAggregateVerify(testSet.message, [testSet.publicKey], sullyUint8Array(testSet.signature.serialize()))
        ).to.be.false;
      });
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
    describe("should default to Promise<false>", () => {
      it("should handle invalid message", async () => {
        expect(await asyncFastAggregateVerify(sullyUint8Array(testSet.message), [testSet.publicKey], testSet.signature))
          .to.be.false;
      });
      it("should handle invalid publicKey", async () => {
        expect(
          await asyncFastAggregateVerify(
            testSet.message,
            [sullyUint8Array(testSet.publicKey.serialize())],
            testSet.signature
          )
        ).to.be.false;
      });
      it("should handle invalid signature", async () => {
        expect(
          await asyncFastAggregateVerify(
            testSet.message,
            [testSet.publicKey],
            sullyUint8Array(testSet.signature.serialize())
          )
        ).to.be.false;
      });
    });
    it("should return true for valid sets", async () => {
      expect(await asyncFastAggregateVerify(testSet.message, [testSet.publicKey], testSet.signature)).to.be.true;
    });
  });
});
