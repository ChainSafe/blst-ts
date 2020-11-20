import fs from "fs";
import fetch from "node-fetch";
import { testBindings } from "./testBindings";
import { ensureDirFromFilepath, getBinaryName, packageJsonPath } from "./paths";

const githubReleasesDownloadUrl =
  "https://github.com/ChainSafe/blst/releases/download";

export async function checkAndDownloadBinary(binaryPath: string) {
  const packageJson = require(packageJsonPath);
  const binaryName = getBinaryName();
  const version = packageJson.version;

  const binaryUrl = `${githubReleasesDownloadUrl}/v${version}/${binaryName}`;

  ensureDirFromFilepath(binaryPath);
  const res = await fetch(binaryUrl);

  // Accept redirects (3xx)
  if (res.status >= 400) {
    throw Error(`${res.status} ${res.statusText}`);
  }

  const dest = fs.createWriteStream(binaryPath);
  res.body.pipe(dest);

  // Make sure downloaded bindings work
  await testBindings(binaryPath);
}
