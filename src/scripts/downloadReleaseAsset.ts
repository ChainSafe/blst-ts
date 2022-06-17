import fs from "fs";
import fetch from "node-fetch";
import {PACKAGE_JSON_PATH} from "./paths";
import {ensureDirFromFilepath} from "./paths_node";

const githubReleasesDownloadUrl = "https://github.com/ChainSafe/blst-ts/releases/download";

export async function downloadReleaseAsset(assetName: string, binaryPath: string): Promise<void> {
  // eslint-disable-next-line
  const packageJson = require(PACKAGE_JSON_PATH);
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
