/* eslint-disable no-console */
import fs from "fs";
import path from "path";
import {Readable} from "stream";
import {finished} from "stream/promises";
import {ReadableStream} from "stream/web";
import {execSync} from "child_process";
import * as tar from "tar";
import {SPEC_TEST_LOCATION, SPEC_TEST_VERSION, SPEC_TEST_REPO_URL, SPEC_TEST_TO_DOWNLOAD} from "./specTestVersioning";

const specVersion = SPEC_TEST_VERSION;
const outputDir = SPEC_TEST_LOCATION;
const specTestsRepoUrl = SPEC_TEST_REPO_URL;

const versionFile = path.join(outputDir, "version.txt");
const existingVersion = fs.existsSync(versionFile) ? fs.readFileSync(versionFile, "utf8").trim() : "none";

if (existingVersion === specVersion) {
  console.log(`version ${specVersion} already downloaded`);
  process.exit(0);
} else {
  console.log(`Downloading new version: ${specVersion} existingVersion: ${existingVersion}`);
}

if (fs.existsSync(outputDir)) {
  console.log(`Cleaning existing version ${existingVersion} at ${outputDir}`);
  shell(`rm -rf ${outputDir}`);
}

fs.mkdirSync(outputDir, {recursive: true});

const urls = SPEC_TEST_TO_DOWNLOAD.map((test) => `${specTestsRepoUrl}/releases/download/${specVersion}/${test}.tar.gz`);

downloadAndExtract(urls, outputDir)
  .then(() => {
    console.log("Downloads and extractions complete.");
    fs.writeFileSync(versionFile, specVersion);
  })
  .catch((error) => {
    console.error(`Error downloading test files: ${error}`);
    process.exit(1);
  });

function shell(cmd: string): string {
  try {
    return execSync(cmd, {encoding: "utf8"}).trim();
  } catch (error) {
    console.error(`Error executing shell command: ${cmd}`);
    throw error;
  }
}

async function downloadAndExtract(urls: string[], outputDir: string): Promise<void> {
  for (const url of urls) {
    const fileName = url.split("/").pop();
    const filePath = path.resolve(outputDir, String(fileName));
    const {body, ok} = await fetch(url);
    if (!ok || !body) {
      throw new Error(`Failed to download ${url}`);
    }

    await finished(Readable.fromWeb(body as ReadableStream<Uint8Array>).pipe(fs.createWriteStream(filePath)));

    await tar.x({
      file: filePath,
      cwd: outputDir,
    });
  }
}
