import {expect} from "chai";
import {PUBLIC_KEY_LENGTH_COMPRESSED, PUBLIC_KEY_LENGTH_UNCOMPRESSED, PublicKey, SecretKey} from "../../index.js";
import {CodeError, expectEqualHex, expectNotEqualHex, sullyUint8Array} from "../utils";
import {validPublicKey, SECRET_KEY_BYTES, invalidInputs, G1_POINT_AT_INFINITY} from "../__fixtures__";

describe("PublicKey", () => {
  it("should exist", () => {
    expect(PublicKey).to.exist;
  });
  describe("constructors", () => {
    describe("new PublicKey()", () => {
      it("should have a private constructor", () => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
        expect(() => new (PublicKey as any)("foo-bar-baz")).to.throw(
          "Class contains no `constructor`, can not new it!"
        );
      });
    });
    describe("deserialize", () => {
      it("should only take 48 or 96 bytes", () => {
        expect(() => PublicKey.fromBytes(Buffer.alloc(32, "*"))).to.throw("Invalid encoding");
      });
      it("should take uncompressed byte arrays", () => {
        expectEqualHex(PublicKey.fromBytes(validPublicKey.uncompressed).toBytes(), validPublicKey.compressed);
      });
      it("should take compressed byte arrays", () => {
        expectEqualHex(PublicKey.fromBytes(validPublicKey.compressed).toBytes(), validPublicKey.compressed);
      });
      describe("argument validation", () => {
        for (const [type, invalid] of invalidInputs) {
          it(`should throw on invalid pkBytes type: ${type}`, () => {
            expect(() => PublicKey.fromBytes(invalid)).to.throw();
          });
        }
        it("should throw incorrect length pkBytes", () => {
          expect(() => PublicKey.fromBytes(Buffer.alloc(12, "*"))).to.throw("Invalid encoding");
        });
      });
      it("should throw on invalid key", () => {
        try {
          PublicKey.fromBytes(sullyUint8Array(validPublicKey.compressed), true);
          expect.fail("Did not throw error for badPublicKey");
        } catch (e) {
          expect((e as CodeError).code === "BLST_POINT_NOT_ON_CURVE" || (e as CodeError).code === "BLST_BAD_ENCODING")
            .to.be.true;
        }
      });
      it("should throw on zero key", () => {
        expect(() => PublicKey.fromBytes(Buffer.from(G1_POINT_AT_INFINITY))).to.throw("Invalid encoding");
      });
    });
  });
  describe("methods", () => {
    describe("toBytes", () => {
      const sk = SecretKey.fromBytes(SECRET_KEY_BYTES);
      const pk = sk.toPublicKey();
      it("should toBytes the key to Uint8Array", () => {
        expect(pk.toBytes()).to.be.instanceof(Uint8Array);
      });
      it("should default to compressed serialization", () => {
        expectEqualHex(pk.toBytes(), pk.toBytes(true));
        expectNotEqualHex(pk.toBytes(), pk.toBytes(false));
      });
      it("should serialize compressed to the correct length", () => {
        expect(pk.toBytes(true)).to.have.lengthOf(PUBLIC_KEY_LENGTH_COMPRESSED);
      });
      it("should serialize uncompressed to the correct length", () => {
        expect(pk.toBytes(false)).to.have.lengthOf(PUBLIC_KEY_LENGTH_UNCOMPRESSED);
      });
    });
    describe("toHex", () => {
      it("should toHex string correctly", () => {
        const key = PublicKey.fromBytes(validPublicKey.compressed);
        expectEqualHex(key.toHex(true), validPublicKey.compressed);
      });
    });
    describe("keyValidate()", () => {
      it("should not throw on valid public key", () => {
        const pk = PublicKey.fromBytes(validPublicKey.uncompressed);
        expect(pk.keyValidate()).to.be.undefined;
      });
    });
  });
});
