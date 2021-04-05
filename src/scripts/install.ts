import fs from "fs";
import {downloadBindings} from "./downloadBindings";
import {buildBindings} from "./buildBindings";
import {getBinaryPath} from "./paths";
import {testBindings} from "./testBindings";

/* eslint-disable no-console */

const libName = "BLST native bindings";

// CLI runner
install().then(
  () => process.exit(0),
  (e) => {
    console.log(e.stack);
    process.exit(1);
  }
);

async function install(): Promise<void> {
  const binaryPath = getBinaryPath();

  // Check if bindings already downloaded or built
  if (fs.existsSync(binaryPath)) {
    try {
      await testBindings(binaryPath);
      console.log(`Using existing ${libName} from ${binaryPath}`);
      return;
    } catch (e) {
      console.log(`Cached ${libName} not OK`);
    }
  }

  // Fetch pre-built bindings from remote repo
  try {
    console.log(`Retrieving ${libName}...`);
    await downloadBindings(binaryPath);
    await testBindings(binaryPath);
    console.log(`Successfully retrieved ${libName}`);
    return;
  } catch (e) {
    if (e.statusCode === 404) {
      console.error(`${libName} not available: ${e.message}`);
    } else {
      e.message = `Error importing ${libName}: ${e.message}`;
      console.error(e);
    }
  }

  // Build bindings locally from source
  try {
    console.log(`Building ${libName} from source...`);
    await buildBindings(binaryPath);
    await testBindings(binaryPath);
    console.log(`Successfully built ${libName} from source`);
    return;
  } catch (e) {
    e.message = `Error building ${libName}: ${e.message}`;
    console.error(e);
  }

  // Fallback?
  throw Error(`Error downloading and building ${libName}. No fallback`);
}
