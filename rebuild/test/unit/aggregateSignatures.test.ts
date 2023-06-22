import {expect} from "chai";
import {aggregateSignatures, Signature} from "../../lib";
import {makeNapiTestSets} from "../utils";

describe("Aggregate Signatures", () => {
  const sets = makeNapiTestSets(10);
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
    it("should return a key that is not in the keys array", () => {
      const agg = aggregateSignatures(signatures);
      const serialized = agg.serialize();
      expect(signatures.find((key) => key.serialize() == serialized)).to.be.undefined;
    });
  });
});
