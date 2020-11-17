const { getBinaryName, getBinaryPath, mkdirBinary } = require("./paths");
const { testBindings } = require("./testBindings");
const { download } = require("./downloadFile");
const packageJson = require("../package.json");

const githubReleasesDownloadUrl =
  "https://github.com/ChainSafe/blst-ts/releases/download";

module.exports.checkAndDownloadBinary = async function checkAndDownloadBinary() {
  const binaryName = getBinaryName();
  const binaryPath = getBinaryPath();
  const version = packageJson.version;

  const binaryUrl = `${githubReleasesDownloadUrl}/v${version}/${binaryName}`;

  console.log(`Retrieving native BLST bindings ${binaryName}...`);
  mkdirBinary();

  await download(binaryUrl, binaryPath);

  // Make sure downloaded bindings work
  await testBindings();
};
