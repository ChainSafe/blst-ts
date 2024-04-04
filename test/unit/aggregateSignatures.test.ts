import {expect} from "chai";
import {aggregateSignatures, Signature} from "../../rebuild/lib";
import {isEqualBytes, getTestSets} from "../utils";
import {badSignature} from "../__fixtures__";

describe("Aggregate Signatures", () => {
  const sets = getTestSets(10);
  const signatures = sets.map(({signature}) => signature);

  describe("aggregateSignatures()", () => {
    it("should return a Signature", () => {
      const agg = aggregateSignatures(signatures);
      expect(agg).to.be.instanceOf(Signature);
    });
    it("should be able to keyValidate Signature", () => {
      const agg = aggregateSignatures(signatures);
      expect(agg.sigValidate()).to.be.undefined;
    });
    it("should throw for invalid Signature", () => {
      expect(() => aggregateSignatures(signatures.concat(badSignature as unknown as Signature))).to.throw(
        "BLST_ERROR::BLST_BAD_ENCODING - Invalid signature at index 10"
      );
    });
    it("should return a key that is not in the keys array", () => {
      const agg = aggregateSignatures(signatures);
      const serialized = agg.serialize();
      expect(signatures.find((sig) => isEqualBytes(sig.serialize(), serialized))).to.be.undefined;
    });
  });
});
