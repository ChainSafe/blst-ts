import {expect} from "chai";
import {PublicKey, SecretKey, Signature} from "../../lib";
import {KEY_MATERIAL, SECRET_KEY_BYTES} from "../__fixtures__";
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
      it("should create an instance", () => {
        expect(SecretKey.fromKeygen(KEY_MATERIAL)).to.be.instanceOf(SecretKey);
      });
      it("should throw incorrect length ikm", () => {
        expect(() => SecretKey.fromKeygen(Buffer.alloc(12, "*"))).to.throw(
          "ikm must be greater than or equal to 32 bytes"
        );
      });
      it("should take valid UintArray8 for ikm", () => {
        expect(SecretKey.fromKeygen(KEY_MATERIAL)).to.be.instanceOf(SecretKey);
      });
      it("should create the same key from the same ikm", () => {
        expectEqualHex(SecretKey.fromKeygen(KEY_MATERIAL), SecretKey.fromKeygen(KEY_MATERIAL));
      });
      it("should take a second 'info' argument", () => {
        expectNotEqualHex(SecretKey.fromKeygen(KEY_MATERIAL, "some fancy info"), SecretKey.fromKeygen(KEY_MATERIAL));
      });
    });
    describe("SecretKey.deserialize", () => {
      it("should create an instance", () => {
        expect(SecretKey.deserialize(SECRET_KEY_BYTES)).to.be.instanceOf(SecretKey);
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
        expect(key.serialize()).to.be.instanceof(Uint8Array);
      });
      it("should be 32 bytes long", () => {
        expect(key.serialize().length).to.equal(32);
      });
      it("should reconstruct the same key", () => {
        const serialized = key.serialize();
        expectEqualHex(SecretKey.deserialize(serialized), serialized);
      });
    });
    describe("toPublicKey", () => {
      it("should create a PublicKey", () => {
        expect(SecretKey.fromKeygen(KEY_MATERIAL).toPublicKey()).to.be.instanceOf(PublicKey);
      });
    });
    describe("sign", () => {
      it("should create a Signature", () => {
        const sig = SecretKey.fromKeygen(KEY_MATERIAL).sign(Buffer.from("some fancy message"));
        expect(sig).to.be.instanceOf(Signature);
      });
    });
  });
});
