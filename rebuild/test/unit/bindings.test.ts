import {expect} from "chai";
import * as bindings from "../../lib";
import {runTest, TestCase, TestPhase, TestSyncOrAsync} from "../utils";

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
          expect(() => runTest(TestSyncOrAsync.SYNC, TestPhase.SETUP, TestCase.SET_ERROR)).to.throw(
            "setup: TestCase.SET_ERROR"
          );
        });
        it("should catch thrown errors", () => {
          expect(() => runTest(TestSyncOrAsync.SYNC, TestPhase.SETUP, TestCase.THROW_ERROR)).to.throw(
            "setup: TestCase.THROW_ERROR"
          );
        });
      });
      describe("execution phase", () => {
        describe("sync execution", () => {
          it("should handle errors using SetError", () => {
            expect(() => runTest(TestSyncOrAsync.SYNC, TestPhase.EXECUTION, TestCase.SET_ERROR)).to.throw(
              "execution: TestCase.SET_ERROR"
            );
          });
          it("should catch thrown errors", () => {
            expect(() => runTest(TestSyncOrAsync.SYNC, TestPhase.EXECUTION, TestCase.THROW_ERROR)).to.throw(
              "std::exception"
            );
          });
          it("should return the correct value", () => {
            expect(runTest(TestSyncOrAsync.SYNC, TestPhase.EXECUTION, 2)).to.equal("CORRECT_VALUE");
          });
        });
        describe("async execution", () => {
          it("should return a Promise that resolves the correct value", async () => {
            const res = runTest(TestSyncOrAsync.ASYNC, TestPhase.EXECUTION, TestCase.NORMAL_EXECUTION);
            expect(res).is.instanceof(Promise);
            expect(await res).to.equal("CORRECT_VALUE");
          });
          it("should handle errors using SetError", async () => {
            try {
              await runTest(TestSyncOrAsync.ASYNC, TestPhase.EXECUTION, TestCase.SET_ERROR);
              throw new Error("Should have thrown");
            } catch (e) {
              expect((e as Error).message).to.equal("execution: TestCase.SET_ERROR");
            }
          });
          it("should catch thrown errors", async () => {
            try {
              await runTest(TestSyncOrAsync.ASYNC, TestPhase.EXECUTION, TestCase.THROW_ERROR);
              throw new Error("Should have thrown");
            } catch (e) {
              expect((e as Error).message).to.equal("std::exception");
            }
          });
        });
      });
      describe("value return phase", () => {
        it("should handle errors using SetError", () => {
          expect(() => runTest(TestSyncOrAsync.SYNC, TestPhase.VALUE_RETURN, TestCase.SET_ERROR)).to.throw(
            "return: TestCase.SET_ERROR"
          );
        });
        it("should catch thrown errors", () => {
          expect(() => runTest(TestSyncOrAsync.SYNC, TestPhase.VALUE_RETURN, TestCase.THROW_ERROR)).to.throw(
            "return: TestCase.THROW_ERROR"
          );
        });
      });
    });
    describe("Uint8ArrayArg", () => {
      it("should hold a reference that persists through gc", () => {
        // TODO: Figure out how to test this
      });
      it("should accept Uint8Array", () => {
        expect(
          runTest(
            TestSyncOrAsync.SYNC,
            TestPhase.SETUP,
            TestCase.UINT_8_ARRAY_ARG,
            Uint8Array.from(Buffer.from("fancy string"))
          )
        ).to.equal("CORRECT_VALUE");
      });
      it("should accept Buffer", () => {
        expect(
          runTest(TestSyncOrAsync.SYNC, TestPhase.SETUP, TestCase.UINT_8_ARRAY_ARG, Buffer.from("fancy string"))
        ).to.equal("CORRECT_VALUE");
      });
      describe("should throw for invalid input", () => {
        it("should throw for numbers", () => {
          expect(() => runTest(TestSyncOrAsync.SYNC, TestPhase.SETUP, TestCase.UINT_8_ARRAY_ARG, 2)).to.throw(
            "TEST must be of type BlstBuffer"
          );
        });
        it("should throw for strings", () => {
          expect(() =>
            runTest(TestSyncOrAsync.SYNC, TestPhase.SETUP, TestCase.UINT_8_ARRAY_ARG, "hello world")
          ).to.throw("TEST must be of type BlstBuffer");
        });
        it("should throw for objects", () => {
          expect(() =>
            runTest(TestSyncOrAsync.SYNC, TestPhase.SETUP, TestCase.UINT_8_ARRAY_ARG, {testing: 123})
          ).to.throw("TEST must be of type BlstBuffer");
        });
        it("should throw for arrays", () => {
          expect(() => runTest(TestSyncOrAsync.SYNC, TestPhase.SETUP, TestCase.UINT_8_ARRAY_ARG, ["foo"])).to.throw(
            "TEST must be of type BlstBuffer"
          );
        });
        it("should throw for null", () => {
          expect(() => runTest(TestSyncOrAsync.SYNC, TestPhase.SETUP, TestCase.UINT_8_ARRAY_ARG, null)).to.throw(
            "TEST must be of type BlstBuffer"
          );
        });
        it("should throw for undefined", () => {
          expect(() => runTest(TestSyncOrAsync.SYNC, TestPhase.SETUP, TestCase.UINT_8_ARRAY_ARG, undefined)).to.throw(
            "TEST must be of type BlstBuffer"
          );
        });
        it("should throw for Symbol", () => {
          expect(() =>
            runTest(TestSyncOrAsync.SYNC, TestPhase.SETUP, TestCase.UINT_8_ARRAY_ARG, Symbol.for("baz"))
          ).to.throw("TEST must be of type BlstBuffer");
        });
        it("should throw for Proxy", () => {
          expect(() =>
            runTest(TestSyncOrAsync.SYNC, TestPhase.SETUP, TestCase.UINT_8_ARRAY_ARG, new Proxy({test: "yo"}, {}))
          ).to.throw("TEST must be of type BlstBuffer");
        });
        it("should throw for Uint16Array", () => {
          expect(() =>
            runTest(TestSyncOrAsync.SYNC, TestPhase.SETUP, TestCase.UINT_8_ARRAY_ARG, new Uint16Array())
          ).to.throw("TEST must be of type BlstBuffer");
        });
      });
    });
    describe("Uint8ArrayArgArray", () => {
      it("should accept an array of Uint8ArrayArg", () => {
        expect(
          runTest(TestSyncOrAsync.SYNC, TestPhase.SETUP, TestCase.UINT_8_ARRAY_ARG_ARRAY, [Buffer.from("valid")])
        ).to.equal("CORRECT_VALUE");
      });
      it("should throw for non-array input", () => {
        expect(() =>
          runTest(TestSyncOrAsync.SYNC, TestPhase.SETUP, TestCase.UINT_8_ARRAY_ARG_ARRAY, Buffer.from("valid"))
        ).to.throw("TESTS must be of type BlstBuffer[]");
      });
    });
  });
});
