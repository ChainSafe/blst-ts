import {expect} from "chai";
import {
  aggregatePublicKeys,
  aggregateSerializedSignatures,
  aggregateWithRandomness,
  asyncAggregateWithRandomness,
  PublicKey,
  Signature,
  verify,
  verifyMultipleAggregateSignatures,
} from "../../index.js";
import {expectNotEqualHex, getTestSet, getTestSetsSameMessage} from "../utils";
import {G1_POINT_AT_INFINITY, G2_POINT_AT_INFINITY} from "../__fixtures__";

describe("Aggregate With Randomness", () => {
  const sameMessageSets = getTestSetsSameMessage(10);
  const msg = sameMessageSets.msg;
  const sets = sameMessageSets.sets.map((s) => ({
    pk: s.pk,
    sig: s.sig.toBytes(),
  }));
  const randomSet = getTestSet(20);
  const infinityPublicKey = Buffer.from(G1_POINT_AT_INFINITY, "hex");

  before(() => {
    // make sure sets are valid before starting
    expect(() => PublicKey.fromBytes(infinityPublicKey).keyValidate()).to.throw("Public key is infinity");
    expect(verify(msg, sets[0].pk, Signature.fromBytes(sets[0].sig))).to.be.true;
    expect(verifyMultipleAggregateSignatures(sets.map((s) => ({msg, pk: s.pk, sig: Signature.fromBytes(s.sig)})))).to.be
      .true;
    expectNotEqualHex(msg, randomSet.msg);
    expect(verify(randomSet.msg, randomSet.pk, randomSet.sig)).to.be.true;
    expect(verifyMultipleAggregateSignatures([randomSet])).to.be.true;
  });

  describe("aggregateWithRandomness()", () => {
    it("should not accept an empty array argument", () => {
      try {
        aggregateWithRandomness([]);
        expect.fail("aggregateWithRandomness with empty list should throw");
      } catch (e) {
        expect((e as any).code).to.equal("BLST_AGGR_TYPE_MISMATCH");
      }
    });
    it("should accept an array of {pk: PublicKey, sig: Uint8Array}", () => {
      expect(() => aggregateWithRandomness([{pk: sets[0].pk, sig: sets[0].sig}])).not.to.throw();
      // invalid publicKey property name
      expect(() => aggregateWithRandomness([{publicKey: sets[0].pk, sig: sets[0].sig} as any])).to.throw(
        "Missing field `pk`"
      );
      // // invalid signature property name
      expect(() => aggregateWithRandomness([{pk: sets[0].pk, signature: sets[0].sig} as any])).to.throw(
        "Missing field `sig`"
      );
      // // invalid publicKey property value
      expect(() => aggregateWithRandomness([{pk: 1 as any, sig: sets[0].sig}])).to.throw();
      // // invalid signature property value
      expect(() => aggregateWithRandomness([{pk: sets[0].pk, sig: "bar" as any}])).to.throw();
    });
    it("should throw for invalid serialized", () => {
      expect(() =>
        aggregateWithRandomness(
          sets.concat({
            pk: sets[0].pk,
            //TODO: (@matthewkeil) this throws error "Public key is infinity" not signature because there is only one blst error
            sig: G2_POINT_AT_INFINITY,
          } as any)
        )
      ).to.throw();
    });
    it("should return a {pk: PublicKey, sig: Signature} object", () => {
      const agg = aggregateWithRandomness(sets);
      expect(agg).to.be.instanceOf(Object);

      expect(agg).to.haveOwnProperty("pk");
      expect(agg.pk).to.be.instanceOf(PublicKey);
      expect(() => agg.pk.keyValidate()).not.to.throw();

      expect(agg).to.haveOwnProperty("sig");
      expect(agg.sig).to.be.instanceOf(Signature);
      expect(() => agg.sig.sigValidate()).not.to.throw();
    });
    it("should add randomness to aggregated publicKey", () => {
      const withoutRandomness = aggregatePublicKeys(sets.map(({pk}) => pk));
      const withRandomness = aggregateWithRandomness(sets).pk;
      expectNotEqualHex(withRandomness, withoutRandomness);
    });
    it("should add randomness to aggregated signature", () => {
      const withoutRandomness = aggregateSerializedSignatures(sets.map(({sig}) => sig));
      const withRandomness = aggregateWithRandomness(sets).sig;
      expectNotEqualHex(withRandomness, withoutRandomness);
    });
    it("should produce verifiable set", () => {
      const {pk, sig} = aggregateWithRandomness(sets);
      expect(verify(msg, pk, sig));
    });
    it("should not validate for different message", async () => {
      const {pk, sig} = aggregateWithRandomness(sets);
      expect(verify(randomSet.msg, pk, sig)).to.be.false;
    });
    it("should not validate included key/sig for different message", async () => {
      const {pk, sig} = aggregateWithRandomness([...sets, {pk: randomSet.pk, sig: randomSet.sig.toBytes()}]);
      expect(verify(msg, pk, sig)).to.be.false;
    });
  });
  describe("asyncAggregateWithRandomness()", () => {
    it("should not accept an empty array argument", async () => {
      try {
        await asyncAggregateWithRandomness([]);
        expect.fail("asyncAggregateWithRandomness with empty list should throw");
      } catch (e) {
        expect((e as any).code).to.equal("BLST_AGGR_TYPE_MISMATCH");
      }
    });
    describe("should accept an array of {pk: PublicKey, sig: Uint8Array}", () => {
      it("should handle valid case", () => {
        expect(() => asyncAggregateWithRandomness([{pk: sets[0].pk, sig: sets[0].sig}])).not.to.throw();
      });
      it("should handle invalid publicKey property name", () => {
        expect(() => asyncAggregateWithRandomness([{publicKey: sets[0].pk, sig: sets[0].sig} as any])).to.throw(
          "Missing field `pk`"
        );
      });
      it("should handle invalid publicKey property value", () => {
        expect(() => asyncAggregateWithRandomness([{pk: 1 as any, sig: sets[0].sig}])).to.throw();
      });
      it("should handle invalid signature property name", () => {
        expect(() => asyncAggregateWithRandomness([{pk: sets[0].pk, signature: sets[0].sig} as any])).to.throw(
          "Missing field `sig`"
        );
      });
      it("should handle invalid signature property value", () => {
        expect(() => asyncAggregateWithRandomness([{pk: sets[0].pk, sig: "bar" as any}])).to.throw();
      });
    });
    it("should throw for invalid serialized", async () => {
      try {
        await asyncAggregateWithRandomness(
          sets.concat({
            pk: sets[0].pk,
            //TODO: (@matthewkeil) this throws error "Public key is infinity" not signature because there is only one blst error
            sig: G2_POINT_AT_INFINITY,
          } as any)
        );
        expect.fail("should not get here");
      } catch (err) {
        expect((err as Error).message).to.contain("Public key is infinity");
      }
    });
    it("should return a {pk: PublicKey, sig: Signature} object", async () => {
      const aggPromise = asyncAggregateWithRandomness(sets);
      expect(aggPromise).to.be.instanceOf(Promise);
      const agg = await aggPromise;
      expect(agg).to.be.instanceOf(Object);

      expect(agg).to.haveOwnProperty("pk");
      expect(agg.pk).to.be.instanceOf(PublicKey);
      expect(() => agg.pk.keyValidate()).not.to.throw();

      expect(agg).to.haveOwnProperty("sig");
      expect(agg.sig).to.be.instanceOf(Signature);
      expect(() => agg.sig.sigValidate()).not.to.throw();
    });
    it("should add randomness to aggregated publicKey", async () => {
      const withoutRandomness = aggregatePublicKeys(sets.map(({pk}) => pk));
      const withRandomness = await asyncAggregateWithRandomness(sets);
      expectNotEqualHex(withRandomness.pk, withoutRandomness);
    });
    it("should add randomness to aggregated signature", async () => {
      const withoutRandomness = aggregateSerializedSignatures(sets.map(({sig}) => sig));
      const withRandomness = await asyncAggregateWithRandomness(sets);
      expectNotEqualHex(withRandomness.sig, withoutRandomness);
    });
    it("should produce verifiable set", async () => {
      const {pk, sig} = await asyncAggregateWithRandomness(sets);
      expect(verify(msg, pk, sig));
    });
    it("should not validate for different message", async () => {
      const {pk, sig} = await asyncAggregateWithRandomness(sets);
      expect(verify(randomSet.msg, pk, sig)).to.be.false;
    });
    it("should not validate included key/sig for different message", async () => {
      const {pk, sig} = await asyncAggregateWithRandomness([...sets, {pk: randomSet.pk, sig: randomSet.sig.toBytes()}]);
      expect(verify(msg, pk, sig)).to.be.false;
    });
  });
});
