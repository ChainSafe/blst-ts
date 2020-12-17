import child_process from "child_process";

const sourceSwgFile = process.argv[1];
const targetCppFile = process.argv[2];

console.log({ sourceSwgFile, targetCppFile });

// Check SWIG version
const swigMajorVersion = getSwigMajorVersion();
if (swigMajorVersion < 4) {
  throw Error("Unsupported SWIG version, must be >= 4");
}

// Build blst_wrap.cpp with SWIG
try {
  child_process.execFileSync("swig", [
    "-c++",
    "-javascript",
    "-node",
    "-DV8_VERSION=0x060000",
    "-o",
    targetCppFile,
    sourceSwgFile,
  ]);
} catch (e) {
  console.error("Error running SWIG");
  throw e;
}

console.log("Done");

/**
 * Parses major version for swig -version
 * @returns {number}
 */
function getSwigMajorVersion() {
  try {
    const swigVersionOutput = child_process.execFileSync("swig", ["-version"]);
    console.log({ swigVersionOutput });

    // ["SWIG Version 4", "4"]
    const match = o.match(/SWIG Version ([0-9]+)/);
    const majorVersion = parseInt(match && match[1]);
    if (!majorVersion) {
      throw Error("Unexpected SWIG version format " + majorVersion);
    }

    return majorVersion;
  } catch (e) {
    console.error("Error getting SWIG major version");
    throw e;
  }
}
