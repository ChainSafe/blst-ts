import {exec} from "./exec";

/**
 * Throw error if SWIG is not installed or version is < 4
 */
export async function assertSupportedSwigVersion() {
  const swigMajorVersion = await getSwigMajorVersion();
  if (swigMajorVersion < 4) {
    throw Error("Unsupported SWIG version, must be >= 4");
  }
}

/**
 * Parses major version for swig -version
 */
export async function getSwigMajorVersion(): Promise<number> {
  const swigVersionOutput = await exec("swig", ["-version"]).catch((e) => {
    e.message = `SWIG is not installed ${e.message}`;
    throw e;
  });

  // ["SWIG Version 4", "4"]
  const match = swigVersionOutput.match(/SWIG Version ([0-9]+)/);
  const majorVersion = match ? parseInt(match[1]) : null;
  if (!majorVersion) {
    throw Error("Unexpected SWIG version format " + majorVersion);
  }

  return majorVersion;
}
