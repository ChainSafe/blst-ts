import {expect} from "chai";
import {BLST_CONSTANTS, CoordType, PublicKey, SecretKey} from "../../lib";
import {expectEqualHex, expectNotEqualHex, sullyUint8Array} from "../utils";
import {
  validPublicKey,
  SECRET_KEY_BYTES,
  invalidInputs,
  badPublicKey,
  G1_POINT_AT_INFINITY,
} from "../__fixtures__";

describe("PublicKey", () => {
  it("should exist", () => {
    expect(PublicKey).to.exist;
  });
  describe("constructors", () => {
    describe("new PublicKey()", () => {
      it("should have a private constructor", () => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
        expect(() => new (PublicKey as any)("foo-bar-baz")).to.throw("PublicKey constructor is private");
      });
    });
    describe("deserialize", () => {
      it("should only take 48 or 96 bytes", () => {
        expect(() => PublicKey.deserialize(Buffer.alloc(32, "*"))).to.throw(
          "pkBytes is 32 bytes, but must be 48 or 96 bytes long"
        );
      });
      it("should take uncompressed byte arrays", () => {
        expectEqualHex(
          PublicKey.deserialize(validPublicKey.uncompressed).serialize(false),
          validPublicKey.uncompressed
        );
      });
      it("should take compressed byte arrays", () => {
        expectEqualHex(PublicKey.deserialize(validPublicKey.compressed).serialize(), validPublicKey.compressed);
      });
      it("should create jacobian or affine points", () => {
        expectEqualHex(
          PublicKey.deserialize(validPublicKey.compressed, CoordType.affine).serialize(),
          validPublicKey.compressed
        );
        expectEqualHex(
          PublicKey.deserialize(validPublicKey.compressed, CoordType.jacobian).serialize(),
          validPublicKey.compressed
        );
      });
      describe("argument validation", () => {
        for (const [type, invalid] of invalidInputs) {
          it(`should throw on invalid pkBytes type: ${type}`, () => {
            expect(() => PublicKey.deserialize(invalid)).to.throw("pkBytes must be a BlstBuffer");
          });
        }
        it("should throw incorrect length pkBytes", () => {
          expect(() => PublicKey.deserialize(Buffer.alloc(12, "*"))).to.throw(
            "pkBytes is 12 bytes, but must be 48 or 96 bytes long"
          );
        });
      });
      it("should throw on invalid key", () => {
        expect(() => PublicKey.deserialize(sullyUint8Array(validPublicKey.compressed))).to.throw("BLST_BAD_ENCODING");
        expect(() => PublicKey.deserialize(badPublicKey)).to.throw("BLST_BAD_ENCODING");
      });
      it("should throw on zero key", () => {
        expect(() => PublicKey.deserialize(Buffer.from(G1_POINT_AT_INFINITY))).to.throw("BLST_BAD_ENCODING");
      });
    });
  });
  describe("methods", () => {
    describe("serialize", () => {
      const sk = SecretKey.deserialize(SECRET_KEY_BYTES);
      const pk = sk.toPublicKey();
      it("should default to compressed serialization", () => {
        expectEqualHex(pk.serialize(), pk.serialize(true));
        expectNotEqualHex(pk.serialize(), pk.serialize(false));
      });
      it("should serialize compressed to the correct length", () => {
        expect(pk.serialize(true)).to.have.lengthOf(BLST_CONSTANTS.PUBLIC_KEY_LENGTH_COMPRESSED);
      });
      it("should serialize uncompressed to the correct length", () => {
        expect(pk.serialize(false)).to.have.lengthOf(BLST_CONSTANTS.PUBLIC_KEY_LENGTH_UNCOMPRESSED);
      });
      it("should serialize affine and jacobian points to the same value", () => {
        const jacobian = PublicKey.deserialize(pk.serialize(), CoordType.jacobian);
        const affine = PublicKey.deserialize(pk.serialize(), CoordType.affine);
        expectEqualHex(jacobian.serialize(true), affine.serialize(true));
        expectEqualHex(jacobian.serialize(false), affine.serialize(false));
      });
    });
    describe("keyValidate()", () => {
      it("should not throw on valid public key", () => {
        const pk = PublicKey.deserialize(validPublicKey.uncompressed);
        expect(pk.keyValidate()).to.be.undefined;
      });
    });
  });
});
