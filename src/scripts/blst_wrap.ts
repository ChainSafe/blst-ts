import {exec} from "./exec";
import {assertSupportedSwigVersion} from "./swig";

/* eslint-disable no-console */

// CLI runner
runSwig().then(
  () => process.exit(0),
  (e) => {
    console.log(e.stack);
    process.exit(1);
  }
);

async function runSwig(): Promise<void> {
  const sourceSwgFile = process.argv[1];
  const targetCppFile = process.argv[2];

  console.log({sourceSwgFile, targetCppFile});

  // Check SWIG version
  await assertSupportedSwigVersion();

  // Build blst_wrap.cpp with SWIG
  try {
    await exec("swig", ["-c++", "-javascript", "-node", "-DV8_VERSION=0x060000", "-o", targetCppFile, sourceSwgFile]);
  } catch (e) {
    console.error("Error running SWIG");
    throw e;
  }

  console.log("Done");
}
