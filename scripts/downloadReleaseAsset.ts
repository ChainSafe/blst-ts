import fs from "fs";
import {pipeline} from "stream";
import {promisify} from "util";
import fetch from "node-fetch";
import {ensureDirFromFilepath, PACKAGE_JSON_PATH} from "./paths";

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

  await promisify(pipeline)(res.body, fs.createWriteStream(binaryPath));
}
