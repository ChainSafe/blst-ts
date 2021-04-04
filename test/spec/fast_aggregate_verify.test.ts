import path from "path";
import {
  describeDirectorySpecTest,
  InputType,
} from "@chainsafe/lodestar-spec-test-util";
import { fromHex, toHex } from "../utils";
import { SPEC_TESTS_DIR } from "../params";
import * as blst from "../../src/lib";

interface IAggregateSigsVerifyTestCase {
  data: {
    input: {
      pubkeys: string[];
      message: string;
      signature: string;
    };
    output: boolean;
  };
}

describeDirectorySpecTest<IAggregateSigsVerifyTestCase, boolean>(
  "bls/fast_aggregate_verify/small",
  path.join(
    SPEC_TESTS_DIR,
    "tests/general/phase0/bls/fast_aggregate_verify/small"
  ),
  (testCase) => {
    try {
      const { pubkeys, message, signature } = testCase.data.input;

      const pks = pubkeys.map((hex) => {
        const pk = blst.PublicKey.fromBytes(fromHex(hex));
        pk.keyValidate();
        return pk;
      });

      return blst.fastAggregateVerify(
        fromHex(message),
        pks,
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
