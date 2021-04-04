import path from "path";
import {
  describeDirectorySpecTest,
  InputType,
} from "@chainsafe/lodestar-spec-test-util";
import { SPEC_TESTS_DIR } from "../params";
import { fromHex } from "../utils";
import * as blst from "../../src/lib";

interface IAggregateSigsVerifyTestCase {
  data: {
    input: {
      pubkeys: string[];
      messages: string[];
      signature: string;
    };
    output: boolean; // Should succeed
  };
}

describeDirectorySpecTest<IAggregateSigsVerifyTestCase, boolean>(
  "bls/aggregate_verify/small",
  path.join(SPEC_TESTS_DIR, "tests/general/phase0/bls/aggregate_verify/small"),
  (testCase) => {
    try {
      const { pubkeys, messages, signature } = testCase.data.input;
      return blst.aggregateVerify(
        messages.map(fromHex),
        pubkeys.map((hex) => blst.PublicKey.fromBytes(fromHex(hex))),
        blst.Signature.fromBytes(fromHex(signature))
      );
    } catch (e) {
      // spec test expect a boolean even for invalid inputs
      if ((e as Error).message.includes("BLST_ERROR")) return false;
      throw e;
    }
  },
  {
    inputTypes: { data: InputType.YAML },
    getExpected: (testCase) => testCase.data.output,
  }
);
