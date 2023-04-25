import {expect} from "chai";
import {Signature} from "../../lib";
import {expectEqualHex, expectNotEqualHex} from "../utils";
import {signatureExample} from "../__fixtures__";

describe("Signature", () => {
  it("should exist", () => {
    expect(Signature).to.exist;
  });
  describe("constructor", () => {
    it("should have a private new Signature()", () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
      expect(() => new (Signature as any)()).to.throw("Signature constructor is private");
    });
    describe("Signature.deserialize()", () => {
      it("should only take Uint8Array or Buffer", () => {
        expect(() => Signature.deserialize(3 as any)).to.throw("sigBytes must be of type BlstBuffer");
      });
      it("should only take 48 or 96 bytes", () => {
        expect(() => Signature.deserialize(Buffer.alloc(32, "*"))).to.throw(
          "sigBytes is 32 bytes, but must be 96 or 192 bytes long"
        );
      });
      it("should take uncompressed byte arrays", () => {
        expectEqualHex(Signature.deserialize(signatureExample.p2).serialize(false), signatureExample.p2);
      });
      it("should take compressed byte arrays", () => {
        expectEqualHex(Signature.deserialize(signatureExample.p2Comp).serialize(), signatureExample.p2Comp);
      });
    });
    describe("methods", () => {
      describe("serialize", () => {
        it("should return uncompressed", () => {
          expectEqualHex(Signature.deserialize(signatureExample.p2).serialize(false), signatureExample.p2);
        });
        it("should return compressed", () => {
          expectEqualHex(Signature.deserialize(signatureExample.p2Comp).serialize(), signatureExample.p2Comp);
        });
      });
      describe("sigValidate()", () => {
        it("should return undefined for valid", () => {
          const sig = Signature.deserialize(signatureExample.p2Comp);
          expect(sig.sigValidateSync()).to.be.undefined;
        });
        it("should throw for invalid", () => {
          const pkSeed = Signature.deserialize(signatureExample.p2Comp);
          const sig = Signature.deserialize(
            Uint8Array.from([...pkSeed.serialize().subarray(0, 94), ...Buffer.from("a1")])
          );
          expect(() => sig.sigValidateSync()).to.throw("blst::BLST_POINT_NOT_IN_GROUP");
        });
      });
    });
  });
});
