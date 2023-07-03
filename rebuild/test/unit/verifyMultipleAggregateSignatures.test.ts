import {expect} from "chai";
import {asyncVerifyMultipleAggregateSignatures, verifyMultipleAggregateSignatures} from "../../lib";
import {makeNapiTestSets} from "../utils";

// describe("SignatureSet", () => {
//   it("should only accept a valid SignatureSet object", () => {
//     expect(runTest(TestSyncOrAsync.SYNC, TestPhase.SETUP, TestCase.SIGNATURE_SET, validSignatureSet)).to.equal(
//       "VALID_TEST"
//     );
//   });
//   describe("should throw for invalid inputs", () => {
//     it("should throw for non-object input", () => {
//       expect(() => runTest(TestSyncOrAsync.SYNC, TestPhase.SETUP, TestCase.SIGNATURE_SET, [])).to.throw(
//         "SignatureSet must be an object with msg, publicKey and signature properties"
//       );
//     });

//     for (const [name, input] of invalidInputs) {
//       it(`should throw for 'msg' that is a ${name}`, () => {
//         const badMsg = {
//           ...validSignatureSet,
//           msg: input,
//         };
//         expect(() => runTest(TestSyncOrAsync.SYNC, TestPhase.SETUP, TestCase.SIGNATURE_SET, badMsg)).to.throw(
//           "msg must be of type BlstBuffer"
//         );
//       });
//       it(`should throw for 'publicKey' that is a ${name}`, () => {
//         const badMsg = {
//           ...validSignatureSet,
//           publicKey: input,
//         };
//         expect(() => runTest(TestSyncOrAsync.SYNC, TestPhase.SETUP, TestCase.SIGNATURE_SET, badMsg)).to.throw(
//           "PublicKeyArg must be a PublicKey instance or a 48/96 byte Uint8Array"
//         );
//       });
//       it(`should throw for 'signature' that is a ${name}`, () => {
//         const badMsg = {
//           ...validSignatureSet,
//           signature: input,
//         };
//         expect(() => runTest(TestSyncOrAsync.SYNC, TestPhase.SETUP, TestCase.SIGNATURE_SET, badMsg)).to.throw(
//           "SignatureArg must be a Signature instance or a 96/192 byte Uint8Array"
//         );
//       });
//     }
//   });
// });
// describe("SignatureSetArray", () => {
//   it("should throw for non-array input", () => {
//     expect(() =>
//       runTest(TestSyncOrAsync.SYNC, TestPhase.SETUP, TestCase.SIGNATURE_SET_ARRAY, Buffer.from("valid"))
//     ).to.throw("signatureSets must be of type SignatureSet[]");
//   });
// });

describe("Verify Multiple Aggregate Signatures", () => {
  describe("verifyMultipleAggregateSignatures", () => {
    it("should return a boolean", () => {
      expect(verifyMultipleAggregateSignatures([])).to.be.a("boolean");
    });
    it("should default to false", () => {
      expect(verifyMultipleAggregateSignatures([])).to.be.false;
    });
    it("should return true for valid sets", () => {
      expect(verifyMultipleAggregateSignatures(makeNapiTestSets(6))).to.be.true;
    });
  });
  describe("asyncVerifyMultipleAggregateSignatures", () => {
    it("should return Promise<boolean>", async () => {
      const resPromise = asyncVerifyMultipleAggregateSignatures([]);
      expect(resPromise).to.be.instanceOf(Promise);
      const res = await resPromise;
      expect(res).to.be.a("boolean");
    });
    it("should default to Promise<false>", async () => {
      expect(await asyncVerifyMultipleAggregateSignatures([])).to.be.false;
    });
    it("should return true for valid sets", async () => {
      expect(await asyncVerifyMultipleAggregateSignatures(makeNapiTestSets(6))).to.be.true;
    });
  });
});
