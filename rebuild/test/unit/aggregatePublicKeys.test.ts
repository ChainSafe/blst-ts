import {expect} from "chai";
import {BLST_CONSTANTS, aggregatePublicKeys, aggregatePublicKeysSync, PublicKey} from "../../lib";
import {makeNapiTestSets} from "../utils";

describe("Aggregate Public Keys", () => {
  const sets = makeNapiTestSets(10);
  const keys = sets.map(({publicKey}) => publicKey);
  const badKey = Uint8Array.from(
    Buffer.from([...keys[0].serialize(false).slice(8), ...Buffer.from("0123456789abcdef", "hex")])
  );

  describe("PublicKeyArg", () => {
    it("should throw for non-array inputs", () => {
      expect(() => aggregatePublicKeysSync(keys[0] as any)).to.throw("publicKeys must be of type PublicKeyArg[]");
    });
    it("should throw for non-PublicKeyArg inputs", () => {
      expect(() => aggregatePublicKeysSync([0] as any)).to.throw(
        "PublicKeyArg must be a PublicKey instance or a 48/96 byte Uint8Array"
      );
    });
  });
  describe("PublicKeyArgArray", () => {
    it("should throw for invalid key", () => {
      expect(badKey.length).to.equal(BLST_CONSTANTS.PUBLIC_KEY_LENGTH_UNCOMPRESSED);
      try {
        aggregatePublicKeysSync([...keys, badKey]);
        throw new Error("function should throw");
      } catch (err) {
        expect((err as Error).message).to.equal("BLST_BAD_ENCODING: Invalid key at index 10");
      }
    });
  });

  describe("aggregatePublicKeysSync()", () => {
    it("should return the promise of a PublicKey", () => {
      const agg = aggregatePublicKeysSync(keys);
      expect(agg).to.be.instanceOf(PublicKey);
    });
    it("should be able to keyValidate PublicKey", () => {
      const agg = aggregatePublicKeysSync(keys);
      expect(agg.keyValidateSync()).to.be.undefined;
    });
    it("should return a key that is not in the keys array", () => {
      const agg = aggregatePublicKeysSync(keys);
      const serialized = agg.serialize();
      expect(keys.find((key) => key.serialize() == serialized)).to.be.undefined;
    });
  });
  describe("aggregatePublicKeys()", () => {
    it("should return the promise of a PublicKey", async () => {
      const aggPromise = aggregatePublicKeys(keys);
      expect(aggPromise).to.be.instanceOf(Promise);
      const agg = await aggPromise;
      expect(agg).to.be.instanceOf(PublicKey);
    });
    it("should be able to keyValidate PublicKey", async () => {
      const agg = await aggregatePublicKeys(keys);
      const res = await agg.keyValidate();
      expect(res).to.be.undefined;
    });
    it("should return a key that is not in the keys array", async () => {
      const agg = await aggregatePublicKeys(keys);
      const serialized = agg.serialize();
      expect(keys.find((key) => key.serialize() == serialized)).to.be.undefined;
    });
  });
});
