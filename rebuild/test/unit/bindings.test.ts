import {expect} from "chai";
import * as bindings from "../../lib";

enum TestPhase {
  SETUP = 0,
  EXECUTION = 1,
  VALUE_RETURN = 2,
}
declare function TestFunction(isAsync: false, testPhase: TestPhase, testCase: number, testObj?: any): string;
declare function TestFunction(isAsync: true, testPhase: TestPhase, testCase: number, testObj?: any): Promise<string>;
declare function TestFunction(
  isAsync: boolean,
  testPhase: TestPhase,
  testCase: number,
  testObj?: any
): string | Promise<string>;
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
        it("should handle errors using SetError", () => {
          expect(() => runTest(false, TestPhase.SETUP, 0)).to.throw("setup: test case 0");
        });
        it("should catch thrown errors", () => {
          expect(() => runTest(false, TestPhase.SETUP, 1)).to.throw("setup: test case 1");
        });
      });
      describe("execution phase", () => {
        describe("sync execution", () => {
          it("should handle errors using SetError", () => {
            expect(() => runTest(false, TestPhase.EXECUTION, 0)).to.throw("execution: test case 0");
          });
          it("should catch thrown errors", () => {
            expect(() => runTest(false, TestPhase.EXECUTION, 1)).to.throw("execution: test case 1");
          });
          it("should return the correct value", () => {
            expect(runTest(false, TestPhase.EXECUTION, 2)).to.equal("CORRECT_VALUE");
          });
        });
        describe("async execution", () => {
          it("should handle errors using SetError", async () => {
            try {
              await runTest(true, TestPhase.EXECUTION, 0);
              throw new Error("Should have thrown");
            } catch (e) {
              expect((e as Error).message).to.equal("execution: test case 0");
            }
          });
          it("should return a Promise", () => {
            const res = runTest(true, TestPhase.EXECUTION, 2);
            expect(res).is.instanceof(Promise);
            return res;
          });
          it("should return a promise that resolves the correct value", async () => {
            const res = await runTest(true, TestPhase.EXECUTION, 2);
            expect(res).to.equal("CORRECT_VALUE");
          });
        });
      });
      describe("value return phase", () => {
        it("should handle errors using SetError", () => {
          expect(() => runTest(false, TestPhase.VALUE_RETURN, 0)).to.throw("return: test case 0");
        });
        it("should catch thrown errors", () => {
          expect(() => runTest(false, TestPhase.VALUE_RETURN, 1)).to.throw("return: test case 1");
        });
      });
    });
    describe("Uint8ArrayArg", () => {
      it("should hold a reference that persists through gc", () => {
        // TODO: Figure out how to test this
      });
      it("should accept Uint8Array", () => {
        expect(runTest(false, TestPhase.SETUP, 2, Uint8Array.from(Buffer.from("fancy string")))).to.equal(
          "CORRECT_VALUE"
        );
      });
      it("should accept Buffer", () => {
        expect(runTest(false, TestPhase.SETUP, 2, Buffer.from("fancy string"))).to.equal("CORRECT_VALUE");
      });
      describe("should throw for invalid input", () => {
        it("should throw for numbers", () => {
          expect(() => runTest(false, TestPhase.SETUP, 2, 2)).to.throw("TEST must be of type BlstBuffer");
        });
        it("should throw for strings", () => {
          expect(() => runTest(false, TestPhase.SETUP, 2, "hello world")).to.throw("TEST must be of type BlstBuffer");
        });
        it("should throw for objects", () => {
          expect(() => runTest(false, TestPhase.SETUP, 2, {testing: 123})).to.throw("TEST must be of type BlstBuffer");
        });
        it("should throw for arrays", () => {
          expect(() => runTest(false, TestPhase.SETUP, 2, ["foo"])).to.throw("TEST must be of type BlstBuffer");
        });
        it("should throw for null", () => {
          expect(() => runTest(false, TestPhase.SETUP, 2, null)).to.throw("TEST must be of type BlstBuffer");
        });
        it("should throw for undefined", () => {
          expect(() => runTest(false, TestPhase.SETUP, 2, undefined)).to.throw("TEST must be of type BlstBuffer");
        });
        it("should throw for Symbol", () => {
          expect(() => runTest(false, TestPhase.SETUP, 2, Symbol.for("baz"))).to.throw(
            "TEST must be of type BlstBuffer"
          );
        });
        it("should throw for Proxy", () => {
          expect(() => runTest(false, TestPhase.SETUP, 2, new Proxy({test: "yo"}, {}))).to.throw(
            "TEST must be of type BlstBuffer"
          );
        });
        it("should throw for Uint16Array", () => {
          expect(() => runTest(false, TestPhase.SETUP, 2, new Uint16Array())).to.throw(
            "TEST must be of type BlstBuffer"
          );
        });
      });
    });
    describe("Uint8ArrayArgArray", () => {
      it("should accept an array of Uint8ArrayArg", () => {
        expect(runTest(false, TestPhase.SETUP, 3, [Buffer.from("valid")])).to.equal("CORRECT_VALUE");
      });
      it("should throw for non-array input", () => {
        expect(() => runTest(false, TestPhase.SETUP, 3, Buffer.from("valid"))).to.throw(
          "TESTS must be of type BlstBuffer[]"
        );
      });
    });
  });
});
