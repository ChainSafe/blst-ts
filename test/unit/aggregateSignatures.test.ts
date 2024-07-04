import {expect} from "chai";
import {aggregateSignatures, Signature} from "../../index.js";
import {isEqualBytes, getTestSets, CodeError} from "../utils";
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
      try {
        aggregateSignatures(signatures.concat(badSignature as unknown as Signature));
      } catch (e) {
        expect((e as CodeError).code.startsWith("BLST")).to.be.true;
        expect(
          (e as CodeError).code.includes("BLST_POINT_NOT_ON_CURVE") || (e as CodeError).code.includes("BLST_BAD_ENCODING")
        ).to.be.true;
      }
    });
    it("should return a key that is not in the keys array", () => {
      const agg = aggregateSignatures(signatures);
      const serialized = agg.toBytes();
      expect(signatures.find((sig) => isEqualBytes(sig.toBytes(), serialized))).to.be.undefined;
    });
  });
});
