import fs from "fs";
import fetch from "node-fetch";
import { ensureDirFromFilepath, packageJsonPath } from "./paths";

const githubReleasesDownloadUrl =
  "https://github.com/ChainSafe/blst/releases/download";

export async function downloadReleaseAsset(
  assetName: string,
  binaryPath: string
) {
  const packageJson = require(packageJsonPath);
  const version = packageJson.version;

  const assetUrl = `${githubReleasesDownloadUrl}/v${version}/${assetName}`;

  ensureDirFromFilepath(binaryPath);
  const res = await fetch(assetUrl);

  // Accept redirects (3xx)
  if (res.status >= 400) {
    throw Error(`${res.status} ${res.statusText}`);
  }

  const dest = fs.createWriteStream(binaryPath);
  res.body.pipe(dest);
}
