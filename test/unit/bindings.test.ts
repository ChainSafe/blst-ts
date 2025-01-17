import {expect} from "chai";
import * as bindings from "../..";

describe("bindings", () => {
  describe("exports", () => {
    const exports = new Set(Object.keys(bindings));
    exports.delete("path");
    exports.delete("default");

    const expectedFunctions = [
      "aggregatePublicKeys",
      "aggregateSignatures",
      "aggregateSerializedPublicKeys",
      "aggregateSerializedSignatures",
      "aggregateWithRandomness",
      "asyncAggregateWithRandomness",
      "verify",
      "aggregateVerify",
      "fastAggregateVerify",
      "verifyMultipleAggregateSignatures",
    ];
    const expectedClasses = ["PublicKey", "SecretKey", "Signature"];
    const expectedConstants = [
      "SECRET_KEY_LENGTH",
      "PUBLIC_KEY_LENGTH_COMPRESSED",
      "PUBLIC_KEY_LENGTH_UNCOMPRESSED",
      "SIGNATURE_LENGTH_COMPRESSED",
      "SIGNATURE_LENGTH_UNCOMPRESSED",
    ];
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
      SECRET_KEY_LENGTH,
      PUBLIC_KEY_LENGTH_COMPRESSED,
      PUBLIC_KEY_LENGTH_UNCOMPRESSED,
      SIGNATURE_LENGTH_COMPRESSED,
      SIGNATURE_LENGTH_UNCOMPRESSED,
    } = bindings;
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
