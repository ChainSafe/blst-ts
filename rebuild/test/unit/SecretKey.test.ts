import {expect} from "chai";
import {PublicKey, SecretKey, Signature, BLST_CONSTANTS} from "../../lib";
import {KEY_MATERIAL, SECRET_KEY_BYTES, invalidInputs} from "../__fixtures__";
import {expectEqualHex, expectNotEqualHex} from "../utils";

describe("SecretKey", () => {
  it("should exist", () => {
    expect(SecretKey).to.exist;
  });
  describe("constructors", () => {
    describe("new SecretKey()", () => {
      it("should have a private constructor", () => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
        expect(() => new (SecretKey as any)("foo-bar-baz")).to.throw("SecretKey constructor is private");
      });
    });
    describe("SecretKey.fromKeygen", () => {
      it("should create an instance from Uint8Array ikm", () => {
        expect(SecretKey.fromKeygen(KEY_MATERIAL)).to.be.instanceOf(SecretKey);
      });
      it("should create the same key from the same ikm", () => {
        expectEqualHex(SecretKey.fromKeygen(KEY_MATERIAL).serialize(), SecretKey.fromKeygen(KEY_MATERIAL).serialize());
      });
      it("should take a second 'info' argument", () => {
        expectNotEqualHex(
          SecretKey.fromKeygen(KEY_MATERIAL, "some fancy info").serialize(),
          SecretKey.fromKeygen(KEY_MATERIAL).serialize()
        );
      });
      describe("argument validation", () => {
        for (const [type, invalid] of invalidInputs) {
          it(`should throw on invalid ikm type: ${type}`, () => {
            expect(() => SecretKey.fromKeygen(invalid)).to.throw("ikm must be a BlstBuffer");
          });
          if (type !== "undefined" && type !== "string") {
            it(`should throw on invalid info type: ${type}`, () => {
              expect(() => SecretKey.fromKeygen(KEY_MATERIAL, invalid)).to.throw("info must be a string");
            });
          }
        }
        it("should throw incorrect length ikm", () => {
          expect(() => SecretKey.fromKeygen(Buffer.alloc(12, "*"))).to.throw(
            "ikm must be greater than or equal to 32 bytes"
          );
        });
      });
    });
    describe("SecretKey.deserialize", () => {
      it("should create an instance", () => {
        expect(SecretKey.deserialize(SECRET_KEY_BYTES)).to.be.instanceOf(SecretKey);
      });
      describe("argument validation", () => {
        for (const [type, invalid] of invalidInputs) {
          it(`should throw on invalid ikm type: ${type}`, () => {
            expect(() => SecretKey.deserialize(invalid)).to.throw("skBytes must be a BlstBuffer");
          });
        }
        it("should throw incorrect length ikm", () => {
          expect(() => SecretKey.deserialize(Buffer.alloc(12, "*"))).to.throw(
            "BLST_ERROR: skBytes must be 32 bytes long"
          );
        });
      });
    });
  });
  describe("instance methods", () => {
    let key: SecretKey;
    beforeEach(() => {
      key = SecretKey.fromKeygen(KEY_MATERIAL);
    });
    describe("serialize", () => {
      it("should serialize the key to Uint8Array", () => {
        expect(key.serialize()).to.be.instanceof(Buffer);
      });
      it("should be the correct length", () => {
        expect(key.serialize().length).to.equal(BLST_CONSTANTS.SECRET_KEY_LENGTH);
      });
      it("should reconstruct the same key", () => {
        const serialized = key.serialize();
        expectEqualHex(SecretKey.deserialize(serialized).serialize(), serialized);
      });
    });
    describe("toPublicKey", () => {
      it("should create a valid PublicKey", () => {
        const pk = key.toPublicKey();
        expect(pk).to.be.instanceOf(PublicKey);
        expect(pk.keyValidate()).to.be.undefined;
      });
      it("should return the same PublicKey from the same SecretKey", () => {
        const sk = SecretKey.deserialize(SECRET_KEY_BYTES);
        const pk1 = sk.toPublicKey().serialize();
        const pk2 = sk.toPublicKey().serialize();
        expectEqualHex(pk1, pk2);
      });
    });
    describe("sign", () => {
      it("should create a valid Signature", () => {
        const sig = SecretKey.fromKeygen(KEY_MATERIAL).sign(Buffer.from("some fancy message"));
        expect(sig).to.be.instanceOf(Signature);
        expect(sig.sigValidate()).to.be.undefined;
      });
    });
  });
});
