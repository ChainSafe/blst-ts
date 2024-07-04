import {expect} from "chai";
import {SIGNATURE_LENGTH, SecretKey, Signature} from "../../index.js";
import {expectEqualHex, expectNotEqualHex, sullyUint8Array} from "../utils";
import {G2_POINT_AT_INFINITY, KEY_MATERIAL, invalidInputs, validSignature} from "../__fixtures__";

describe("Signature", () => {
  it("should exist", () => {
    expect(Signature).to.exist;
  });
  describe("constructor", () => {
    describe("Signature.fromBytes()", () => {
      it("should take uncompressed byte arrays", () => {
        expectEqualHex(
          Signature.fromBytes(validSignature.uncompressed).toBytes(),
          validSignature.compressed
        );
      });
      it("should take compressed byte arrays", () => {
        expectEqualHex(Signature.fromBytes(validSignature.compressed).toBytes(), validSignature.compressed);
      });
      describe("argument validation", () => {
        for (const [type, invalid] of invalidInputs) {
          it(`should throw on invalid pkBytes type: ${type}`, () => {
            expect(() => Signature.fromBytes(invalid)).to.throw();
          });
        }
        it("should only take 96 or 192 bytes", () => {
          expect(() => Signature.fromBytes(Buffer.alloc(32, "*"))).to.throw();
        });
      });
      it("should throw on invalid key", () => {
        expect(() => Signature.fromBytes(sullyUint8Array(validSignature.compressed))).to.throw();
      });
    });
  });
  describe("methods", () => {
    describe("toBytes", () => {
      const sig = SecretKey.fromKeygen(KEY_MATERIAL).sign(Buffer.from("some fancy message"));
      it("should toBytes the signature to Uint8Array", () => {
        expect(sig.toBytes()).to.be.instanceof(Uint8Array);
      });
      it("should toBytes compressed to the correct length", () => {
        expect(sig.toBytes()).to.have.lengthOf(SIGNATURE_LENGTH);
      });
    });
    describe("toHex", () => {
      it("should toHex string correctly", () => {
        const key = Signature.fromBytes(validSignature.compressed);
        expectEqualHex(key.toHex(), validSignature.compressed);
      });
    });
    describe("sigValidate()", () => {
      it("should return undefined for valid", () => {
        const sig = Signature.fromBytes(validSignature.compressed);
        expect(sig.sigValidate()).to.be.undefined;
      });
      it("should throw for invalid", () => {
        const pkSeed = Signature.fromBytes(validSignature.compressed);
        const sig = Signature.fromBytes(
          Uint8Array.from([...pkSeed.toBytes().subarray(0, 94), ...Buffer.from("a1")])
        );
        expect(() => sig.sigValidate()).to.throw("BLST_ERROR::BLST_POINT_NOT_IN_GROUP");
      });
    });
  });
});
