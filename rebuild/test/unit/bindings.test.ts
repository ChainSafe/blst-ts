import {expect} from "chai";
import * as bindings from "../../lib";

type TestFunction<T> = (
  msg: bindings.BlstBuffer,
  msgs: bindings.BlstBuffer[],
  publicKey: bindings.PublicKeyArg,
  publicKeys: bindings.PublicKeyArg[],
  signature: bindings.SignatureArg,
  signatures: bindings.SignatureArg[]
) => T;
type TestSync = TestFunction<boolean>;
type TestAsync = TestFunction<Promise<boolean>>;
interface BindingsTestRigs {
  testSync: TestSync;
  testAsync: TestAsync;
}
const {testSync, testAsync} = bindings as unknown as BindingsTestRigs;

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
    it("should have a testSync function", () => {
      expect(testSync).to.be.a("function");
    });
    it("should have a testAsync function", () => {
      expect(testAsync).to.be.a("function");
    });
    describe("BlstAsyncWorker", () => {
      it("should run synchronously and return a value", () => {
        console.log(testSync("" as any, [] as any, "" as any, [] as any, "" as any, [] as any));
      });
      it("should run asynchronously and return a Promise of a value", () => {});
      it("should not run if there is an error processing arguments", () => {});
    });
    describe("Uint8ArrayArg", () => {
      it("should hold a reference that persists through gc", () => {});
      it("should accept Uint8Array", () => {});
      it("should accept Buffer", () => {});
      it("should throw for invalid input", () => {});
    });
    describe("Uint8ArrayArgArray", () => {});
    describe("PublicKeyArg", () => {
      it("should hold a reference that persists through gc", () => {});
      it("should accept Uint8Array", () => {});
      it("should accept a PublicKey instance", () => {});
      it("should throw for invalid input", () => {});
    });
    describe("PublicKeyArgArray", () => {});
    describe("SignatureArg", () => {
      it("should hold a reference that persists through gc", () => {});
      it("should accept Uint8Array", () => {});
      it("should accept Signature instance", () => {});
      it("should throw for invalid input", () => {});
    });
    describe("SignatureArgArray", () => {});
  });
});
