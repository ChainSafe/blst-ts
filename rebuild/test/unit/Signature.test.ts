import {expect} from "chai";
import {BLST_CONSTANTS, CoordType, SecretKey, Signature} from "../../lib";
import {expectEqualHex, expectNotEqualHex, sullyUint8Array} from "../utils";
import {KEY_MATERIAL, invalidInputs, validSignature} from "../__fixtures__";

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
      it("should take uncompressed byte arrays", () => {
        expectEqualHex(
          Signature.deserialize(validSignature.uncompressed).serialize(false),
          validSignature.uncompressed
        );
      });
      it("should take compressed byte arrays", () => {
        expectEqualHex(Signature.deserialize(validSignature.compressed), validSignature.compressed);
      });
      it("should create jacobian or affine points", () => {
        expectEqualHex(Signature.deserialize(validSignature.compressed, CoordType.affine), validSignature.compressed);
        expectEqualHex(Signature.deserialize(validSignature.compressed, CoordType.jacobian), validSignature.compressed);
      });
      describe("argument validation", () => {
        for (const [type, invalid] of invalidInputs) {
          it(`should throw on invalid pkBytes type: ${type}`, () => {
            expect(() => Signature.deserialize(invalid)).to.throw("sigBytes must be a BlstBuffer");
          });
        }
        it("should only take 96 or 192 bytes", () => {
          expect(() => Signature.deserialize(Buffer.alloc(32, "*"))).to.throw(
            "sigBytes is 32 bytes, but must be 96 or 192 bytes long"
          );
        });
      });
      it("should throw on invalid key", () => {
        expect(() => Signature.deserialize(sullyUint8Array(validSignature.compressed))).to.throw("BLST_BAD_ENCODING");
      });
    });
    describe("methods", () => {
      describe("serialize", () => {
        const sig = SecretKey.fromKeygen(KEY_MATERIAL).sign(Buffer.from("some fancy message"));
        it("should default to compressed serialization", () => {
          expectEqualHex(sig, sig.serialize(true));
          expectNotEqualHex(sig, sig.serialize(false));
        });
        it("should serialize compressed to the correct length", () => {
          expect(sig.serialize(true)).to.have.lengthOf(BLST_CONSTANTS.SIGNATURE_LENGTH_COMPRESSED);
        });
        it("should serialize uncompressed to the correct length", () => {
          expect(sig.serialize(false)).to.have.lengthOf(BLST_CONSTANTS.SIGNATURE_LENGTH_UNCOMPRESSED);
        });
        it("should serialize affine and jacobian points to the same value", () => {
          const jacobian = Signature.deserialize(sig.serialize(), CoordType.jacobian);
          const affine = Signature.deserialize(sig.serialize(), CoordType.affine);
          expectEqualHex(jacobian.serialize(true), affine.serialize(true));
          expectEqualHex(jacobian.serialize(false), affine.serialize(false));
        });
      });
      describe("sigValidate()", () => {
        it("should return undefined for valid", () => {
          const sig = Signature.deserialize(validSignature.compressed);
          expect(sig.sigValidate()).to.be.undefined;
        });
        it("should throw for invalid", () => {
          const pkSeed = Signature.deserialize(validSignature.compressed);
          const sig = Signature.deserialize(
            Uint8Array.from([...pkSeed.serialize().subarray(0, 94), ...Buffer.from("a1")])
          );
          expect(() => sig.sigValidate()).to.throw("blst::BLST_POINT_NOT_IN_GROUP");
        });
      });
    });
  });
});
