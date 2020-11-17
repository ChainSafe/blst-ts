import fs from "fs";
import { checkAndDownloadBinary } from "./downloadBindings";
import { buildBindings } from "./buildBindings";
import { getBinaryPath } from "./paths";
import { testBindings } from "./testBindings";

const libName = "BLST native bindings";

async function install() {
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

  try {
    console.log(`Retrieving ${libName}...`);
    await checkAndDownloadBinary(binaryPath);
    await testBindings(binaryPath);
    console.log(`Successfully retrieved ${libName}`);
    return;
  } catch (e) {
    if (e.statusCode === 404) {
      console.error(`${libName} not available: ${e.message}`);
    } else {
      console.error(`Error importing ${libName}: ${e.stack}`);
    }
  }

  try {
    console.log(`Building ${libName} from source...`);
    await buildBindings(binaryPath);
    await testBindings(binaryPath);
    console.log(`Successfully built ${libName} from source`);
    return;
  } catch (e) {
    console.error(`Error building ${libName}: ${e.stack}`);
  }

  // Fallback?
  throw Error(`Error downloading and building ${libName}. No fallback`);
}

install();
