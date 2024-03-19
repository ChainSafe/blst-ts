/* eslint-disable no-console */
import {existsSync} from "fs";
import {getBinaryName, getPrebuiltBinaryPath, testBindings, downloadBindings, buildBindings} from "./helpers";

// CLI runner
install().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  }
);

async function install(): Promise<void> {
  const binaryName = getBinaryName();

  // Check if bindings already bundled, downloaded or built
  let binaryPath: string | undefined = getPrebuiltBinaryPath(binaryName);
  if (existsSync(binaryPath)) {
    try {
      await testBindings(binaryPath);
      return;
    } catch {
      console.log("Prebuilt and bundled bindings failed to load. Attempting to download.");
    }
  }

  // Fetch pre-built bindings from remote repo
  try {
    binaryPath = await downloadBindings(binaryName);
  } catch {
    /* no-op */
  }

  if (existsSync(binaryPath)) {
    try {
      await testBindings(binaryPath);
      return;
    } catch {
      console.log("Downloaded bindings failed to load. Attempting to build.");
    }
  }

  // Build bindings locally from source
  try {
    binaryPath = await buildBindings(binaryPath);
  } catch (e) {
    if (e instanceof Error) {
      console.error(`Error building blst-ts binary:\n${e.message}`);
    }
    throw e;
  }

  if (existsSync(binaryPath)) {
    try {
      await testBindings(binaryPath);
      return;
    } catch {
      console.log("Locally built bindings failed to load. No fallback available");
    }
  }

  throw new Error("Failed to install blst-ts bindings");
}
