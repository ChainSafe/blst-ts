import {expect} from "chai";
import {aggregatePublicKeys, PublicKey} from "../../lib";
import {makeNapiTestSets} from "../utils";

describe("Aggregate Public Keys", () => {
  const sets = makeNapiTestSets(10);
  const keys = sets.map(({publicKey}) => publicKey);

  describe("aggregatePublicKeys()", () => {
    it("should return the promise of a PublicKey", () => {
      const agg = aggregatePublicKeys(keys);
      expect(agg).to.be.instanceOf(PublicKey);
    });
    it("should be able to keyValidate PublicKey", () => {
      const agg = aggregatePublicKeys(keys);
      expect(agg.keyValidate()).to.be.undefined;
    });
    it("should return a key that is not in the keys array", () => {
      const agg = aggregatePublicKeys(keys);
      const serialized = agg.serialize();
      expect(keys.find((key) => key.serialize() == serialized)).to.be.undefined;
    });
  });
});
