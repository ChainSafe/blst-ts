import {expect} from "chai";
import * as bindings from "../../lib";

enum TestPhase {
  SETUP = 0,
  EXECUTION = 1,
  VALUE_RETURN = 2,
}
declare function TestFunction(isAsync: false, testPhase: TestPhase, testCase: number): string;
declare function TestFunction(isAsync: true, testPhase: TestPhase, testCase: number): Promise<string>;
declare function TestFunction(isAsync: boolean, testPhase: TestPhase, testCase: number): string | Promise<string>;
type BindingsWithTestRig = typeof bindings & {runTest: typeof TestFunction};
const {runTest} = bindings as unknown as BindingsWithTestRig;

describe("bindings", () => {
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
  describe("C++ implementations", () => {
    describe("BlstAsyncWorker", () => {
      describe("setup phase", () => {
        it("should handle errors using SetError", () => {});
        it("should catch thrown errors", () => {});
      });
      describe("execution phase", () => {
        describe("sync execution", () => {
          it("should handle errors using SetError", () => {});
          it("should catch thrown errors", () => {});
          it("should return the correct value", () => {});
        });
        describe("async execution", () => {
          it("should handle errors using SetError", () => {});
          it("should catch thrown errors", () => {});
          it("should return a Promise", () => {});
          it("should return a promise that resolves the correct value", () => {});
        });
      });
      describe("value return phase", () => {
        it("should handle errors using SetError", () => {});
        it("should catch thrown errors", () => {});
      });
    });
    describe("Uint8ArrayArg", () => {
      it("should hold a reference that persists through gc", () => {});
      it("should accept Uint8Array", () => {});
      it("should accept Buffer", () => {});
      it("should throw for invalid input", () => {});
    });
    describe("Uint8ArrayArgArray", () => {
      // make array with a single Uint8ArrayArg and run tests from Uint8ArrayArg
    });
  });
});
