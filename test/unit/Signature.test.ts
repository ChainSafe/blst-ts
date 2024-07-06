import {expect} from "chai";
import {SIGNATURE_LENGTH_COMPRESSED, SIGNATURE_LENGTH_UNCOMPRESSED, SecretKey, Signature} from "../../";
import {expectEqualHex, expectNotEqualHex, sullyUint8Array} from "../utils";
import {KEY_MATERIAL, invalidInputs, validSignature} from "../__fixtures__";

describe("Signature", () => {
  it("should exist", () => {
    expect(Signature).to.exist;
  });
  describe("constructor", () => {
    it("should have a private new Signature()", () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
      expect(() => new (Signature as any)()).to.throw("Class contains no `constructor`, can not new it!");
    });
    describe("Signature.fromBytes()", () => {
      it("should take uncompressed byte arrays", () => {
        expectEqualHex(Signature.fromBytes(validSignature.uncompressed).toBytes(), validSignature.compressed);
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
          expect(() => Signature.fromBytes(Buffer.alloc(32, "*"))).to.throw("Invalid encoding");
        });
      });
      it("should throw on invalid key", () => {
        expect(() => Signature.fromBytes(sullyUint8Array(validSignature.compressed))).to.throw("Invalid encoding");
      });
    });
  });
  describe("methods", () => {
    describe("toBytes", () => {
      const sig = SecretKey.fromKeygen(KEY_MATERIAL).sign(Buffer.from("some fancy message"));
      it("should toBytes the signature to Uint8Array", () => {
        expect(sig.toBytes()).to.be.instanceof(Uint8Array);
      });
      it("should default to compressed serialization", () => {
        expectEqualHex(sig.toBytes(), sig.toBytes(true));
        expectNotEqualHex(sig.toBytes(), sig.toBytes(false));
      });
      it("should serialize compressed to the correct length", () => {
        expect(sig.toBytes(true)).to.have.lengthOf(SIGNATURE_LENGTH_COMPRESSED);
      });
      it("should serialize uncompressed to the correct length", () => {
        expect(sig.toBytes(false)).to.have.lengthOf(SIGNATURE_LENGTH_UNCOMPRESSED);
      });
    });
    describe("toHex", () => {
      it("should toHex string correctly", () => {
        const key = Signature.fromBytes(validSignature.compressed);
        expectEqualHex(key.toHex(true), validSignature.compressed);
      });
    });
    describe("sigValidate()", () => {
      it("should return undefined for valid", () => {
        const sig = Signature.fromBytes(validSignature.compressed);
        expect(sig.sigValidate()).to.be.undefined;
      });
      it("should throw for invalid", () => {
        const pkSeed = Signature.fromBytes(validSignature.compressed);
        const sig = Signature.fromBytes(Uint8Array.from([...pkSeed.toBytes().subarray(0, 94), ...Buffer.from("a1")]));
        expect(() => sig.sigValidate()).to.throw("Point not in group");
      });
    });
  });
});
