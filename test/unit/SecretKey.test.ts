import {expect} from "chai";
import {PublicKey, SECRET_KEY_LENGTH, SecretKey, Signature} from "../../index.js";
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
        expect(() => new (SecretKey as any)("foo-bar-baz")).to.throw(
          "Class contains no `constructor`, can not new it!"
        );
      });
    });
    describe("SecretKey.fromKeygen", () => {
      it("should create an instance from Uint8Array ikm", () => {
        expect(SecretKey.fromKeygen(KEY_MATERIAL)).to.be.instanceOf(SecretKey);
      });
      it("should create the same key from the same ikm", () => {
        expectEqualHex(SecretKey.fromKeygen(KEY_MATERIAL).toBytes(), SecretKey.fromKeygen(KEY_MATERIAL).toBytes());
      });
      it("should take a second 'info' argument", () => {
        expectNotEqualHex(
          SecretKey.fromKeygen(KEY_MATERIAL, Buffer.from("some fancy info")).toBytes(),
          SecretKey.fromKeygen(KEY_MATERIAL).toBytes()
        );
      });
      describe("argument validation", () => {
        const validInfoTypes = ["undefined", "null", "string"];
        for (const [type, invalid] of invalidInputs) {
          it(`should throw on invalid ikm type: ${type}`, () => {
            expect(() => SecretKey.fromKeygen(invalid)).to.throw();
          });
          if (!validInfoTypes.includes(type)) {
            it(`should throw on invalid info type: ${type}`, () => {
              expect(() => SecretKey.fromKeygen(KEY_MATERIAL, invalid)).to.throw();
            });
          }
        }
        it("should throw incorrect length ikm", () => {
          expect(() => SecretKey.fromKeygen(Buffer.alloc(12, "*"))).to.throw("Invalid encoding");
        });
      });
    });
    describe("SecretKey.fromBytes", () => {
      it("should create an instance", () => {
        expect(SecretKey.fromBytes(SECRET_KEY_BYTES)).to.be.instanceOf(SecretKey);
      });
      describe("argument validation", () => {
        for (const [type, invalid] of invalidInputs) {
          it(`should throw on invalid ikm type: ${type}`, () => {
            expect(() => SecretKey.fromBytes(invalid)).to.throw();
          });
        }
        it("should throw incorrect length ikm", () => {
          expect(() => SecretKey.fromBytes(Buffer.alloc(12, "*"))).to.throw("Invalid encoding");
        });
      });
    });
  });
  describe("instance methods", () => {
    let key: SecretKey;
    beforeEach(() => {
      key = SecretKey.fromKeygen(KEY_MATERIAL);
    });
    describe("toBytes", () => {
      it("should toBytes the key to Uint8Array", () => {
        expect(key.toBytes()).to.be.instanceof(Uint8Array);
      });
      it("should be the correct length", () => {
        expect(key.toBytes().length).to.equal(SECRET_KEY_LENGTH);
      });
      it("should reconstruct the same key", () => {
        const serialized = key.toBytes();
        expectEqualHex(SecretKey.fromBytes(serialized).toBytes(), serialized);
      });
    });
    describe("toHex", () => {
      it("should toHex string correctly", () => {
        const key = SecretKey.fromBytes(SECRET_KEY_BYTES);
        expectEqualHex(key.toHex(), SECRET_KEY_BYTES);
      });
    });
    describe("toPublicKey", () => {
      it("should create a valid PublicKey", () => {
        const pk = key.toPublicKey();
        expect(pk).to.be.instanceOf(PublicKey);
        expect(pk.keyValidate()).to.be.undefined;
      });
      it("should return the same PublicKey from the same SecretKey", () => {
        const sk = SecretKey.fromBytes(SECRET_KEY_BYTES);
        const pk1 = sk.toPublicKey().toBytes();
        const pk2 = sk.toPublicKey().toBytes();
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
