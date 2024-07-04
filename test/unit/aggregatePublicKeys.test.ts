import {expect} from "chai";
import {aggregatePublicKeys, PublicKey} from "../../lib";
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
    it("should throw for invalid PublicKey", function () {
      try {
        aggregatePublicKeys(keys.concat(badPublicKey as unknown as PublicKey));
        expect.fail("Did not throw error for badPublicKey");
      } catch (e) {
        expect((e as Error).message.startsWith("BLST_ERROR")).to.be.true;
        expect(
          (e as Error).message.includes("BLST_POINT_NOT_ON_CURVE") || (e as Error).message.includes("BLST_BAD_ENCODING")
        ).to.be.true;
        expect((e as Error).message.endsWith("Invalid key at index 10")).to.be.true;
      }
    });
    it("should return a key that is not in the keys array", () => {
      const agg = aggregatePublicKeys(keys);
      const serialized = agg.serialize();
      expect(keys.find((key) => isEqualBytes(key.serialize(), serialized))).to.be.undefined;
    });
  });
});
