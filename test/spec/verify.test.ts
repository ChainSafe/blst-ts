import path from "path";
import {describeDirectorySpecTest, InputType} from "@chainsafe/lodestar-spec-test-util";
import {SPEC_TEST_LOCATION} from "./specTestVersioning";
import {fromHex} from "../utils";
import * as blst from "../../src/lib";

interface VerifyTestCase {
  meta: unknown;
  data: {
    input: {
      pubkey: string;
      message: string;
      signature: string;
    };
    output: boolean;
  };
}

describeDirectorySpecTest<VerifyTestCase, boolean>(
  "bls/verify/small",
  path.join(SPEC_TEST_LOCATION, "tests/general/phase0/bls/verify/small"),
  (testCase) => {
    try {
      const {pubkey, message, signature} = testCase.data.input;
      return blst.verify(
        fromHex(message),
        blst.PublicKey.fromBytes(fromHex(pubkey)),
        blst.Signature.fromBytes(fromHex(signature))
      );
    } catch (e) {
      // spec test expect a boolean even for invalid inputs
      if ((e as Error).message.includes("BLST_ERROR")) return false;
      throw e;
    }
  },
  {
    inputTypes: {data: InputType.YAML},
    getExpected: (testCase) => testCase.data.output,
  }
);
