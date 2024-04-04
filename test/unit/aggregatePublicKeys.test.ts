import {expect} from "chai";
import {aggregatePublicKeys, PublicKey} from "../../rebuild/lib";
import {isEqualBytes, getTestSets} from "../utils";
import {badPublicKey} from "../__fixtures__";

describe("Aggregate Public Keys", () => {
  const sets = getTestSets(10);
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
    it("should throw for invalid PublicKey", () => {
      expect(() => aggregatePublicKeys(keys.concat(badPublicKey as unknown as PublicKey))).to.throw(
        "BLST_ERROR::BLST_BAD_ENCODING: Invalid key at index 10"
      );
    });
    it("should return a key that is not in the keys array", () => {
      const agg = aggregatePublicKeys(keys);
      const serialized = agg.serialize();
      expect(keys.find((key) => isEqualBytes(key.serialize(), serialized))).to.be.undefined;
    });
  });
});
