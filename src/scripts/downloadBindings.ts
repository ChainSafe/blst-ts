import { testBindings } from "./testBindings";
import { download } from "./downloadFile";
import { ensureDirFromFilepath, getBinaryName, packageJsonPath } from "./paths";

const githubReleasesDownloadUrl =
  "https://github.com/ChainSafe/blst-ts/releases/download";

export async function checkAndDownloadBinary(binaryPath: string) {
  const packageJson = require(packageJsonPath);
  const binaryName = getBinaryName();
  const version = packageJson.version;

  const binaryUrl = `${githubReleasesDownloadUrl}/v${version}/${binaryName}`;

  ensureDirFromFilepath(binaryPath);
  await download(binaryUrl, binaryPath);

  // Make sure downloaded bindings work
  await testBindings(binaryPath);
}
