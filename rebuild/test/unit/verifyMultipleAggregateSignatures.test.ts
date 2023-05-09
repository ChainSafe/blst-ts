import {expect} from "chai";
import {verifyMultipleAggregateSignatures, verifyMultipleAggregateSignaturesSync} from "../../lib";
import {TestCase, TestPhase, TestSyncOrAsync, makeNapiTestSets, runTest} from "../utils";

describe("SignatureSet", () => {
  it("should only accept an object", () => {});
  it("should accept a BlstBuffer for 'msg' property", () => {});
  it("should accept a PublicKeyArg for 'publicKey' property", () => {});
  it("should accept a SignatureArg for 'signature' property", () => {});
  describe("should throw for invalid inputs", () => {});
});
describe("SignatureSetArray", () => {
  it("should throw for non-array input", () => {
    expect(() =>
      runTest(TestSyncOrAsync.SYNC, TestPhase.SETUP, TestCase.PUBLIC_KEY_ARG_ARRAY, Buffer.from("valid"))
    ).to.throw("publicKeys must be of type PublicKeyArg[]");
  });
});

// describe("verifyMultipleAggregateSignatures", () => {
//   const sets = makeNapiTestSets(10).map((set) => {
//     const {msg, secretKey, publicKey, signature} = set;
//     return {
//       msg,
//       secretKey,
//       publicKey,
//       signature,
//     };
//   });
//   describe("Inputs", () => {
//     // const asBuffers = sets.map(({msg, secretKey, publicKey, signature}) => ({
//     //   msg: Buffer.from(msg),
//     //   secretKey: secretKey.serialize(),
//     //   publicKey: publicKey.serialize(),
//     //   signature: signature.serialize(),
//     // }));
//     it("should take Uint8Array inputs", () => {
//       // expect(() => verifyMultipleAggregateSignaturesSync(asBuffers)).not.to.throw;
//     });
//     describe("Invalid inputs", () => {
//       it("should throw for not passing an array", () => {});
//       it("should throw for not passing an array of objects", () => {});
//       it("each SignatureSet.msg exists", () => {});
//       it("each SignatureSet.publicKey exists", () => {});
//       it("each SignatureSet.signature exists", () => {});
//     });
//   });
//   describe("Synchronous", () => {
//     it("should exist", () => {
//       expect(typeof verifyMultipleAggregateSignaturesSync).to.equal("function");
//     });
//     it("should return a boolean", () => {
//       const result = verifyMultipleAggregateSignaturesSync([]);
//       expect(typeof result).to.equal("boolean");
//     });
//     it("should default to false", () => {
//       const result = verifyMultipleAggregateSignaturesSync([]);
//       expect(result).to.be.false;
//     });
//     it("should return true for valid sets", () => {
//       // const res = verifyMultipleAggregateSignaturesSync(sets);
//       // expect(res).to.be.true;
//     });
//   });
//   describe("Promise Based", () => {
//     it("should exist", () => {
//       expect(typeof verifyMultipleAggregateSignatures).to.equal("function");
//     });
//     it("should return a Promise<boolean>", async () => {
//       // const resPromise = verifyMultipleAggregateSignatures([]);
//       // expect(resPromise).to.be.instanceOf(Promise);
//       // const result = await resPromise;
//       // expect(typeof result).to.equal("boolean");
//     });
//     it("should default to false", async () => {
//       // const result = await verifyMultipleAggregateSignatures([]);
//       // expect(result).to.be.false;
//     });
//     it("should return true for valid sets", async () => {
//       // const res = await verifyMultipleAggregateSignatures(sets);
//       // expect(res).to.be.true;
//     });
//   });
// });
