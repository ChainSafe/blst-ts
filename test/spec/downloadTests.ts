import {downloadTests} from "./utils";
import {ethereumConsensusSpecsTests, blsSpecTests} from "./specTestVersioning";

/* eslint-disable no-console */

for (const downloadTestOpts of [ethereumConsensusSpecsTests, blsSpecTests]) {
  downloadTests(downloadTestOpts, console.log).catch((e: Error) => {
    console.error(e);
    process.exit(1);
  });
}
