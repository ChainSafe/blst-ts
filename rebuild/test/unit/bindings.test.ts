import {expect} from "chai";
import * as bindings from "../../lib/index.js";

describe("bindings", () => {
  describe("exports", () => {
    const exports = new Set(Object.keys(bindings));
    exports.delete("path");
    exports.delete("default");

    const expectedFunctions = [
      "aggregatePublicKeys",
      "aggregateSignatures",
      "verify",
      "asyncVerify",
      "fastAggregateVerify",
      "asyncFastAggregateVerify",
      "aggregateVerify",
      "asyncAggregateVerify",
      "verifyMultipleAggregateSignatures",
      "asyncVerifyMultipleAggregateSignatures",
    ];
    const expectedClasses = ["PublicKey", "SecretKey", "Signature"];
    const expectedConstants = ["CoordType", "BLST_CONSTANTS"];
    after(() => {
      expect(exports.size).to.equal(0);
    });
    it("should export all the expected functions", () => {
      for (const expected of expectedFunctions) {
        if (!exports.has(expected)) {
          throw new Error(`Missing export: ${expected}`);
        }
        exports.delete(expected);
      }
    });
    it("should export all the expected classes", () => {
      for (const expected of expectedClasses) {
        if (!exports.has(expected)) {
          throw new Error(`Missing export: ${expected}`);
        }
        exports.delete(expected);
      }
    });
    it("should export all the expected constants", () => {
      for (const expected of expectedConstants) {
        if (!exports.has(expected)) {
          throw new Error(`Missing export: ${expected}`);
        }
        exports.delete(expected);
      }
    });
  });
  describe("constants", () => {
    const {
      DST,
      PUBLIC_KEY_LENGTH_UNCOMPRESSED,
      SECRET_KEY_LENGTH,
      PUBLIC_KEY_LENGTH_COMPRESSED,
      SIGNATURE_LENGTH_COMPRESSED,
      SIGNATURE_LENGTH_UNCOMPRESSED,
    } = bindings.BLST_CONSTANTS;
    it("DST", () => {
      expect(DST).to.be.a("string");
    });
    it("SECRET_KEY_LENGTH", () => {
      expect(SECRET_KEY_LENGTH).to.be.a("number");
    });
    it("PUBLIC_KEY_LENGTH_UNCOMPRESSED", () => {
      expect(PUBLIC_KEY_LENGTH_UNCOMPRESSED).to.be.a("number");
    });
    it("PUBLIC_KEY_LENGTH_COMPRESSED", () => {
      expect(PUBLIC_KEY_LENGTH_COMPRESSED).to.be.a("number");
    });
    it("SIGNATURE_LENGTH_COMPRESSED", () => {
      expect(SIGNATURE_LENGTH_COMPRESSED).to.be.a("number");
    });
    it("SIGNATURE_LENGTH_UNCOMPRESSED", () => {
      expect(SIGNATURE_LENGTH_UNCOMPRESSED).to.be.a("number");
    });
  });
});
