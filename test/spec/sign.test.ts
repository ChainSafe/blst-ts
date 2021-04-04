import path from "path";
import {
  describeDirectorySpecTest,
  InputType,
} from "@chainsafe/lodestar-spec-test-util";
import { fromHex, toHex } from "../utils";
import { SPEC_TESTS_DIR } from "../params";
import * as blst from "../../src/lib";

class ZeroSecretKeyError {}

interface ISignMessageTestCase {
  data: {
    input: {
      privkey: string;
      message: string;
    };
    output: string;
  };
}

describeDirectorySpecTest<ISignMessageTestCase, string | null>(
  "bls/sign/small",
  path.join(SPEC_TESTS_DIR, "tests/general/phase0/bls/sign/small"),
  (testCase) => {
    try {
      const { privkey, message } = testCase.data.input;
      const sk = blst.SecretKey.fromBytes(fromHex(privkey));
      const signature = sk.sign(fromHex(message));
      return toHex(signature.toBytes());
    } catch (e) {
      // spec test expect a boolean even for invalid inputs
      if ((e as Error).message.includes("BLST_ERROR")) return null;
      throw e;
    }
  },
  {
    inputTypes: { data: InputType.YAML },
    getExpected: (testCase) => testCase.data.output,
  }
);
