import {resolve} from "path";
import {promisify} from "util";
import {pipeline} from "stream";
import {execSync} from "child_process";
import {copyFileSync, createWriteStream, existsSync, mkdirSync} from "fs";
import fetch from "node-fetch";
import {exec} from "./exec";

import {BINDINGS_NAME} from "../lib/bindings";

const ROOT_DIR = resolve(__dirname, "..");
const PREBUILD_DIR = resolve(ROOT_DIR, "prebuild");

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const VERSION: string = require(resolve(ROOT_DIR, "package.json")).version;
const BINDINGS_FILE = `${BINDINGS_NAME}.node`;

class NotNodeJsError extends Error {
  constructor(missingItem: string) {
    super(`blst-ts bindings only run in a NodeJS context. No ${missingItem} found.`);
  }
}

/**
 * Builds a list of search paths to look for the bindings file
 */
function buildSearchPaths(filename: string): string[] {
  const searchLocations: string[][] = [
    [ROOT_DIR],
    [ROOT_DIR, "prebuild"],
    [ROOT_DIR, "build"],
    [ROOT_DIR, "build", "Debug"],
    [ROOT_DIR, "build", "Release"],
  ];

  return searchLocations.map((location) => resolve(...location, filename));
}

/**
 * Locates the bindings file using the blst-ts naming convention for prebuilt
 * bindings. Falls back to node-gyp naming if not found.
 */
export function getBindingsPath(...names: string[]): string {
  if (names.length === 0) {
    names.push(getBinaryName());
    names.push(BINDINGS_FILE);
  }
  const searchLocations = names.map((name) => buildSearchPaths(name)).flat();
  for (const filepath of searchLocations) {
    if (existsSync(filepath)) {
      return filepath;
    }
  }

  throw Error(`Could not find bindings file. Tried:\n${searchLocations.join("\n")}`);
}

/**
 * Loading prebuilt bindings may fail in any number of unhappy ways, including a
 * segfault. We use child processes to catch these unrecoverable process-level
 * errors and continue the installation process
 */
export async function testBindings(binaryPath: string): Promise<void> {
  execSync(`node -e 'require("${binaryPath}")'`);
}

/**
 * Get binary name.
 * name: {platform}-{arch}-{v8 version}-blst_ts_addon.node
 */
export function getBinaryName(): string {
  if (!process) throw new NotNodeJsError("global object");
  const platform = process.platform;
  if (!platform) throw new NotNodeJsError("process.platform");
  const arch = process.arch;
  if (!arch) throw new NotNodeJsError("process.arch");
  const nodeApiVersion = process.versions.modules;
  if (!nodeApiVersion) throw new NotNodeJsError("process.versions.modules");

  return [platform, arch, nodeApiVersion, BINDINGS_FILE].join("-");
}

export function getPrebuiltBinaryPath(binaryName: string): string {
  return resolve(PREBUILD_DIR, binaryName);
}

function getReleaseUrl(binaryName: string): string {
  return `https://github.com/ChainSafe/blst-ts/releases/download/v${VERSION}/${binaryName}`;
}

/**
 * Download bindings from GitHub release
 */
export async function downloadBindings(binaryName: string): Promise<string> {
  const {body, status} = await fetch(getReleaseUrl(binaryName));

  if (!body || status >= 400) {
    throw new Error("Failed to download bindings");
  }

  if (!existsSync(PREBUILD_DIR)) {
    mkdirSync(PREBUILD_DIR, {recursive: true});
  }

  const outputPath = getPrebuiltBinaryPath(binaryName);
  await promisify(pipeline)(body, createWriteStream(outputPath));

  return outputPath;
}

export async function buildBindings(binaryName: string): Promise<string> {
  await exec("npm run clean:gyp", true, {cwd: ROOT_DIR});
  await exec("npm run build:gyp", true, {cwd: ROOT_DIR});
  const bindingPath = getBindingsPath(BINDINGS_FILE);

  if (!existsSync(PREBUILD_DIR)) {
    mkdirSync(PREBUILD_DIR, {recursive: true});
  }

  const outputPath = getPrebuiltBinaryPath(binaryName);
  copyFileSync(bindingPath, outputPath);
  return outputPath;
}
