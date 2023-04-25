import {expect} from "chai";
import {PublicKey, SecretKey} from "../../lib";
import {expectEqualHex, expectNotEqualHex} from "../utils";
import {publicKeyExample, SECRET_KEY_BYTES} from "../__fixtures__";

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
      it("should return the same PublicKey from the same SecretKey", () => {
        const sk = SecretKey.deserialize(SECRET_KEY_BYTES);
        const pk1 = sk.toPublicKey();
        const pk2 = sk.toPublicKey();
        expect(pk1.serialize().toString()).to.equal(pk2.serialize().toString());
      });
    });
    describe("serialize", () => {
      it("should default to compressed serialization", () => {
        const sk = SecretKey.deserialize(SECRET_KEY_BYTES);
        const pk = sk.toPublicKey();
        expectEqualHex(pk, pk.serialize(true));
        expectNotEqualHex(pk, pk.serialize(false));
      });
    });
    describe("deserialize", () => {
      it("should only take Uint8Array or Buffer", () => {
        expect(() => PublicKey.deserialize(3 as any)).to.throw("pkBytes must be of type BlstBuffer");
      });
      it("should only take 48 or 96 bytes", () => {
        expect(() => PublicKey.deserialize(Buffer.alloc(32, "*"))).to.throw(
          "pkBytes is 32 bytes, but must be 48 or 96 bytes long"
        );
      });
      it("should take uncompressed byte arrays", () => {
        expectEqualHex(PublicKey.deserialize(publicKeyExample.p1).serialize(false), publicKeyExample.p1);
      });
      it("should take compressed byte arrays", () => {
        expectEqualHex(PublicKey.deserialize(publicKeyExample.p1Comp), publicKeyExample.p1Comp);
        expectEqualHex(PublicKey.deserialize(publicKeyExample.p1Comp).serialize(true), publicKeyExample.p1Comp);
      });
      it("should throw on invalid key", () => {
        const pkSeed = PublicKey.deserialize(publicKeyExample.p1Comp);
        expect(() =>
          PublicKey.deserialize(Uint8Array.from([...pkSeed.serialize().subarray(0, 46), ...Buffer.from("a1")]))
        ).to.throw("BLST_POINT_NOT_ON_CURVE");
      });
    });
  });
  describe("methods", () => {
    describe("keyValidate()", () => {
      it("should not throw on valid public key", async () => {
        const pk = PublicKey.deserialize(publicKeyExample.p1);
        return pk.keyValidate().then((res) => expect(res).to.be.undefined);
      });
    });
    describe("keyValidateSync()", () => {
      it("should not throw on valid public key", async () => {
        const pk = PublicKey.deserialize(publicKeyExample.p1);
        expect(pk.keyValidateSync()).to.be.undefined;
      });
    });
  });
});
