import { exec } from "./exec";

// CLI runner
runSwig().then(
  () => process.exit(0),
  (e) => {
    console.log(e.stack);
    process.exit(1);
  }
);

async function runSwig() {
  const sourceSwgFile = process.argv[1];
  const targetCppFile = process.argv[2];

  console.log({ sourceSwgFile, targetCppFile });

  // Check SWIG version
  const swigMajorVersion = await getSwigMajorVersion();
  if (swigMajorVersion < 4) {
    throw Error("Unsupported SWIG version, must be >= 4");
  }

  // Build blst_wrap.cpp with SWIG
  try {
    await exec(
      [
        "swig",
        "-c++",
        "-javascript",
        "-node",
        "-DV8_VERSION=0x060000",
        "-o",
        targetCppFile,
        sourceSwgFile,
      ].join(" ")
    );
  } catch (e) {
    console.error("Error running SWIG");
    throw e;
  }

  console.log("Done");
}

/**
 * Parses major version for swig -version
 */
async function getSwigMajorVersion(): Promise<number> {
  try {
    const swigVersionOutput = await exec("swig -version");
    console.log({ swigVersionOutput });

    // ["SWIG Version 4", "4"]
    const match = swigVersionOutput.match(/SWIG Version ([0-9]+)/);
    const majorVersion = match ? parseInt(match[1]) : null;
    if (!majorVersion) {
      throw Error("Unexpected SWIG version format " + majorVersion);
    }

    return majorVersion;
  } catch (e) {
    console.error("Error getting SWIG major version");
    throw e;
  }
}
