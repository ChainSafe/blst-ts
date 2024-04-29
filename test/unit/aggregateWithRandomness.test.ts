import {expect} from "chai";
import {
  aggregatePublicKeys,
  aggregateSignatures,
  aggregateWithRandomness,
  asyncVerify,
  PublicKey,
  Signature,
  verify,
  verifyMultipleAggregateSignatures,
} from "../../lib";
import {expectNotEqualHex, getTestSet, getTestSetsSameMessage} from "../utils";

describe("Aggregate With Randomness", () => {
  const {message, sets} = getTestSetsSameMessage(10);
  const randomSet = getTestSet(20);
  before(() => {
    // make sure sets are valid before starting
    expect(verify(message, sets[0].publicKey, sets[0].signature)).to.be.true;
    expect(verifyMultipleAggregateSignatures(sets.map((s) => ({...s, message})))).to.be.true;
    expectNotEqualHex(message, randomSet.message);
    expect(verify(randomSet.message, randomSet.publicKey, randomSet.signature)).to.be.true;
    expect(verifyMultipleAggregateSignatures([randomSet])).to.be.true;
  });

  describe("aggregateWithRandomness()", () => {
    it("should not accept an empty array argument", () => {
      expect(() => aggregateWithRandomness([])).to.throw("Empty array passed to aggregateWithRandomness");
    });
    it("should accept an array of {publicKey: PublicKey, signature: Signature}", () => {
      expect(() =>
        aggregateWithRandomness([{publicKey: sets[0].publicKey, signature: sets[0].signature}])
      ).not.to.throw();
      // invalid publicKey property name
      expect(() =>
        aggregateWithRandomness([{pubkey: sets[0].publicKey, signature: sets[0].signature} as any])
      ).to.throw("BLST_ERROR: Invalid PublicKeyArg at index 0");
      // invalid signature property name
      expect(() => aggregateWithRandomness([{publicKey: sets[0].publicKey, sig: sets[0].signature} as any])).to.throw(
        "BLST_ERROR: Invalid SignatureArg at index 0"
      );
      // invalid publicKey property value
      expect(() => aggregateWithRandomness([{publicKey: 1 as any, signature: sets[0].signature}])).to.throw(
        "BLST_ERROR: Invalid PublicKeyArg at index 0"
      );
      // invalid signature property value
      expect(() => aggregateWithRandomness([{publicKey: sets[0].publicKey, signature: "bar" as any}])).to.throw(
        "BLST_ERROR: Invalid SignatureArg at index 0"
      );
    });
    it("should return an object", () => {
      const agg = aggregateWithRandomness(sets);
      expect(agg).to.be.instanceOf(Object);
    });
    it("should return a {publicKey: PublicKey} property", () => {
      const agg = aggregateWithRandomness(sets);
      expect(agg).to.haveOwnProperty("publicKey");
      expect(agg.publicKey).to.be.instanceOf(PublicKey);
      expect(() => agg.publicKey.keyValidate()).not.to.throw();
    });
    it("should return a valid {signature: Signature} property", () => {
      const agg = aggregateWithRandomness(sets);
      expect(agg).to.haveOwnProperty("signature");
      expect(agg.signature).to.be.instanceOf(Signature);
      expect(() => agg.signature.sigValidate()).not.to.throw();
    });
    it("should add randomness to aggregated publicKey", () => {
      const withoutRandomness = aggregatePublicKeys(sets.map(({publicKey}) => publicKey));
      const withRandomness = aggregateWithRandomness(sets).publicKey;
      expectNotEqualHex(withRandomness, withoutRandomness);
    });
    it("should add randomness to aggregated signature", () => {
      const withoutRandomness = aggregateSignatures(sets.map(({signature}) => signature));
      const withRandomness = aggregateWithRandomness(sets).signature;
      expectNotEqualHex(withRandomness, withoutRandomness);
    });
    it("should produce verifiable set", () => {
      const {publicKey, signature} = aggregateWithRandomness(sets);
      expect(verify(message, publicKey, signature));
    });
    it("should not validate for different message", async () => {
      const {publicKey, signature} = aggregateWithRandomness(sets);
      expect(verify(randomSet.message, publicKey, signature)).to.be.false;
    });
    it("should not validate included key/sig for different message", async () => {
      const {publicKey, signature} = aggregateWithRandomness([
        ...sets,
        {publicKey: randomSet.publicKey, signature: randomSet.signature},
      ]);
      expect(verify(message, publicKey, signature)).to.be.false;
    });
  });
});
