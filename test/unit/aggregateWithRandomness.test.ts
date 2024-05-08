import {expect} from "chai";
import {
  aggregatePublicKeys,
  aggregateSignatures,
  aggregateWithRandomness,
  asyncAggregateWithRandomness,
  PublicKey,
  Signature,
  verify,
  verifyMultipleAggregateSignatures,
} from "../../lib";
import {expectNotEqualHex, getTestSet, getTestSetsSameMessage} from "../utils";
import {G1_POINT_AT_INFINITY} from "../__fixtures__";

describe("Aggregate With Randomness", () => {
  const {message, sets} = getTestSetsSameMessage(10);
  const randomSet = getTestSet(20);
  const infinityPublicKey = Buffer.from(G1_POINT_AT_INFINITY, "hex");

  before(() => {
    // make sure sets are valid before starting
    expect(() => PublicKey.deserialize(infinityPublicKey).keyValidate()).to.throw("BLST_ERROR::BLST_PK_IS_INFINITY");
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
    it("should accept a boolean for validateSerialized", () => {
      expect(() => aggregateWithRandomness(sets, true)).not.to.throw();
      expect(() => aggregateWithRandomness(sets, false)).not.to.throw();
      expect(() => aggregateWithRandomness(sets, "false" as any)).to.throw(
        "Must pass a boolean for validateSerialized"
      );
    });
    it("should throw for invalid serialized", () => {
      expect(() =>
        aggregateWithRandomness(
          sets.concat({
            publicKey: infinityPublicKey,
            signature: sets[0].signature,
          } as any),
          true
        )
      ).to.throw("BLST_ERROR: Invalid key at index 10");
    });
    it("should not throw for invalid serialized if false passed", () => {
      expect(() =>
        aggregateWithRandomness(
          sets.concat({
            publicKey: infinityPublicKey,
            signature: sets[0].signature,
          } as any),
          false
        )
      ).not.to.throw();
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
  describe("asyncAggregateWithRandomness()", () => {
    const asyncSets = sets.map((s) => ({...s, signature: s.signature.serialize()}));
    it("should not accept an empty array argument", async () => {
      try {
        await asyncAggregateWithRandomness([]);
      } catch (e) {
        expect((e as Error).message).to.equal("Empty array passed to asyncAggregateWithRandomness");
      }
    });
    it.only("should accept an array of {publicKey: PublicKey, signature: Signature}", async () => {
      try {
        await asyncAggregateWithRandomness([{publicKey: asyncSets[0].publicKey, signature: asyncSets[0].signature}]);
      } catch (e) {
        console.log(e);
        expect.fail("should not throw");
      }
      // try {
      //   await asyncAggregateWithRandomness([
      //     {pubkey: asyncSets[0].publicKey, signature: asyncSets[0].signature} as any,
      //   ]);
      // } catch (e) {
      //   expect((e as Error).message).to.equal("BLST_ERROR: Invalid PublicKeyArg at index 0");
      // }
      // // invalid signature property name
      // expect(
      //   async () =>
      //     await asyncAggregateWithRandomness([{publicKey: asyncSets[0].publicKey, sig: asyncSets[0].signature} as any])
      // ).to.throw("BLST_ERROR: Invalid SignatureArg at index 0");
      // // invalid publicKey property value
      // expect(
      //   async () => await asyncAggregateWithRandomness([{publicKey: 1 as any, signature: asyncSets[0].signature}])
      // ).to.throw("BLST_ERROR: Invalid PublicKeyArg at index 0");
      // // invalid signature property value
      // expect(
      //   async () => await asyncAggregateWithRandomness([{publicKey: asyncSets[0].publicKey, signature: "bar" as any}])
      // ).to.throw("BLST_ERROR: Invalid SignatureArg at index 0");
    });
    it("should accept a boolean for validateSerialized", () => {
      expect(async () => await asyncAggregateWithRandomness(asyncSets, true)).not.to.throw();
      expect(async () => await asyncAggregateWithRandomness(asyncSets, false)).not.to.throw();
      expect(async () => await asyncAggregateWithRandomness(asyncSets, "false" as any)).to.throw(
        "Must pass a boolean for validateSerialized"
      );
    });
    it("should throw for invalid serialized", () => {
      expect(
        async () =>
          await asyncAggregateWithRandomness(
            asyncSets.concat({
              publicKey: infinityPublicKey,
              signature: asyncSets[0].signature,
            } as any),
            true
          )
      ).to.throw("BLST_ERROR: Invalid key at index 10");
    });
    it("should not throw for invalid serialized if false passed", () => {
      expect(
        async () =>
          await asyncAggregateWithRandomness(
            asyncSets.concat({
              publicKey: infinityPublicKey,
              signature: asyncSets[0].signature,
            } as any),
            false
          )
      ).not.to.throw();
    });
    it("should return an object", async () => {
      const agg = await asyncAggregateWithRandomness(asyncSets);
      expect(agg).to.be.instanceOf(Object);
    });
    it("should return a {publicKey: PublicKey} property", async () => {
      const agg = await asyncAggregateWithRandomness(asyncSets);
      expect(agg).to.haveOwnProperty("publicKey");
      expect(agg.publicKey).to.be.instanceOf(PublicKey);
      expect(() => agg.publicKey.keyValidate()).not.to.throw();
    });
    it("should return a valid {signature: Signature} property", async () => {
      const agg = await asyncAggregateWithRandomness(asyncSets);
      expect(agg).to.haveOwnProperty("signature");
      expect(agg.signature).to.be.instanceOf(Signature);
      expect(() => agg.signature.sigValidate()).not.to.throw();
    });
    it("should add randomness to aggregated publicKey", async () => {
      const withoutRandomness = aggregatePublicKeys(asyncSets.map(({publicKey}) => publicKey));
      const {publicKey: withRandomness} = await asyncAggregateWithRandomness(asyncSets);
      expectNotEqualHex(withRandomness, withoutRandomness);
    });
    it("should add randomness to aggregated signature", async () => {
      const withoutRandomness = aggregateSignatures(asyncSets.map(({signature}) => signature));
      const {signature: withRandomness} = await asyncAggregateWithRandomness(asyncSets);
      expectNotEqualHex(withRandomness, withoutRandomness);
    });
    it("should produce verifiable set", async () => {
      const {publicKey, signature} = await asyncAggregateWithRandomness(asyncSets);
      expect(verify(message, publicKey, signature));
    });
    it("should not validate for different message", async () => {
      const {publicKey, signature} = await asyncAggregateWithRandomness(asyncSets);
      expect(verify(randomSet.message, publicKey, signature)).to.be.false;
    });
    it("should not validate included key/sig for different message", async () => {
      const {publicKey, signature} = await asyncAggregateWithRandomness([
        ...asyncSets,
        {publicKey: randomSet.publicKey, signature: randomSet.signature},
      ]);
      expect(verify(message, publicKey, signature)).to.be.false;
    });
  });
});
