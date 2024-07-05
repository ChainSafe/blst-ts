import {expect} from "chai";
import {aggregatePublicKeys, PublicKey} from "../../index.js";
import {isEqualBytes, getTestSets, CodeError} from "../utils";
import {badPublicKey} from "../__fixtures__";

describe("Aggregate Public Keys", () => {
  const sets = getTestSets(10);
  const keys = sets.map(({pk}) => pk);

  describe("aggregatePublicKeys()", () => {
    it("should return a PublicKey", () => {
      const agg = aggregatePublicKeys(keys);
      expect(agg).to.be.instanceOf(PublicKey);
    });
    it("should be able to keyValidate PublicKey", () => {
      const agg = aggregatePublicKeys(keys);
      expect(agg.keyValidate()).to.be.undefined;
    });
    it("should throw for invalid PublicKey", function () {
      try {
        aggregatePublicKeys(keys.concat(PublicKey.fromBytes(badPublicKey)), true);
        expect.fail("Did not throw error for badPublicKey");
      } catch (e) {
        expect((e as CodeError).code?.includes("BLST"), `${e}`).to.be.true;
      }
    });
    it("should return a key that is not in the keys array", () => {
      const agg = aggregatePublicKeys(keys);
      const serialized = agg.toBytes();
      expect(keys.find((key) => isEqualBytes(key.toBytes(), serialized))).to.be.undefined;
    });
  });
});
