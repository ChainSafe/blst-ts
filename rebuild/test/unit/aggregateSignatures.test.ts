import {expect} from "chai";
import {aggregateSignatures, aggregateSignaturesSync, Signature} from "../../lib";
import {makeNapiTestSets} from "../utils";

describe("Aggregate Public Keys", () => {
  const sets = makeNapiTestSets(10);
  const signatures = sets.map(({signature}) => signature);
  const badSignature = Uint8Array.from(
    Buffer.from([...signatures[0].serialize(false).slice(8), ...Buffer.from("0123456789abcdef", "hex")])
  );

  describe("aggregateSignaturesSync()", () => {
    it("should return a Signature", () => {
      const agg = aggregateSignaturesSync(signatures);
      expect(agg).to.be.instanceOf(Signature);
    });
    it("should be able to keyValidate Signature", () => {
      const agg = aggregateSignaturesSync(signatures);
      expect(agg.sigValidateSync()).to.be.undefined;
    });
    it("should return a key that is not in the keys array", () => {
      const agg = aggregateSignaturesSync(signatures);
      const serialized = agg.serialize();
      expect(signatures.find((key) => key.serialize() == serialized)).to.be.undefined;
    });
    it("should throw for non-array inputs", () => {
      expect(() => aggregateSignaturesSync(signatures[0] as any)).to.throw(
        "ignatures argument must be of type SignatureArg[]"
      );
    });
    it("should throw for SignatureArg inputs", () => {
      expect(() => aggregateSignaturesSync([0] as any)).to.throw(
        "SignatureArg must be a Signature instance or a 96/192 byte Uint8Array"
      );
    });
    it("should throw for invalid key", () => {
      expect(badSignature.length).to.equal(192);
      try {
        aggregateSignaturesSync([...signatures, badSignature]);
        throw new Error("function should throw");
      } catch (err) {
        expect((err as Error).message).to.equal("BLST_ERROR::BLST_BAD_ENCODING: Invalid signature at index 10");
      }
    });
  });
  describe("aggregateSignatures()", () => {
    it("should return the promise of a Signature", async () => {
      const aggPromise = aggregateSignatures(signatures);
      expect(aggPromise).to.be.instanceOf(Promise);
      const agg = await aggPromise;
      expect(agg).to.be.instanceOf(Signature);
    });
    it("should be able to keyValidate Signature", async () => {
      const agg = await aggregateSignatures(signatures);
      const res = await agg.sigValidate();
      expect(res).to.be.undefined;
    });
    it("should return a key that is not in the keys array", async () => {
      const agg = await aggregateSignatures(signatures);
      const serialized = agg.serialize();
      expect(signatures.find((key) => key.serialize() == serialized)).to.be.undefined;
    });
    it("should throw for non-array inputs", () => {
      expect(() => aggregateSignatures(signatures[0] as any)).to.throw(
        "ignatures argument must be of type SignatureArg[]"
      );
    });
    it("should throw for SignatureArg inputs", () => {
      expect(() => aggregateSignatures([0] as any)).to.throw(
        "SignatureArg must be a Signature instance or a 96/192 byte Uint8Array"
      );
    });
    it("should throw for invalid key", async () => {
      expect(badSignature.length).to.equal(192);
      try {
        await aggregateSignatures([...signatures, badSignature]);
        throw new Error("function should throw");
      } catch (err) {
        expect((err as Error).message).to.equal("BLST_ERROR::BLST_BAD_ENCODING: Invalid signature at index 10");
      }
    });
  });
});
