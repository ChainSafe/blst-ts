import path from "path";
import {describeDirectorySpecTest, InputType} from "@chainsafe/lodestar-spec-test-util";
import {SPEC_TEST_LOCATION} from "./specTestVersioning";
import {fromHex, toHex} from "../utils";
import * as blst from "../../src/lib";

interface IAggregateSigsTestCase {
  meta: unknown;
  data: {
    input: string[];
    output: string;
  };
}

describeDirectorySpecTest<IAggregateSigsTestCase, string | null>(
  "bls/aggregate/small",
  path.join(SPEC_TEST_LOCATION, "tests/general/phase0/bls/aggregate/small"),
  (testCase) => {
    try {
      const sigsHex = testCase.data.input;
      const agg = blst.aggregateSignatures(sigsHex.map((hex) => blst.Signature.fromBytes(fromHex(hex))));
      return toHex(agg.toBytes());
    } catch (e) {
      // spec test expect a boolean even for invalid inputs
      if ((e as Error).message.includes("BLST_ERROR")) return null;
      throw e;
    }
  },
  {
    inputTypes: {data: InputType.YAML},
    getExpected: (testCase) => testCase.data.output,
  }
);
