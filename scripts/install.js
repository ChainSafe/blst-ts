const fs = require("fs");
const { checkAndDownloadBinary } = require("./downloadBindings");
const { buildBindings } = require("./buildBindings");
const { getBinaryPath } = require("./paths");

async function install() {
  const binaryPath = getBinaryPath();

  // Check if bindings already downloaded or built
  if (fs.existsSync(binaryPath)) {
    try {
      await testBindings(binaryPath);
      return;
    } catch (e) {
      console.log("Cached BLST native bindings not OK");
    }
  }

  try {
    await checkAndDownloadBinary();
    await testBindings(binaryPath);
    return;
  } catch (e) {
    if (e.statusCode === 404) {
      console.error(`BLST native bindings not available: ${e.message}`);
    } else {
      console.error(`Error importing BLST native bindings: ${e.stack}`);
    }
  }

  try {
    await buildBindings();
    await testBindings(binaryPath);
  } catch (e) {
    console.error(`Error building BLST native bindings: ${e.stack}`);
  }

  // Fallback?
}

install();
