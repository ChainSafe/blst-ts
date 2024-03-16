import fs from "fs";
import path from "path";

const ROOT_DIR = path.join(__dirname, "../..");
const BLST_NODE = "blst.node";
export const PREBUILD_DIR = path.join(ROOT_DIR, "prebuild");
export const PACKAGE_JSON_PATH = path.join(ROOT_DIR, "package.json");
export const BINDINGS_DIR = path.join(ROOT_DIR, "blst/bindings/node.js");

// Paths for blst_wrap.cpp
// Resolve path to absolute since it will be used from a different working dir
// when running blst_wrap.py
export const BLST_WRAP_CPP_PREBUILD = path.resolve(ROOT_DIR, "prebuild", "blst_wrap.cpp");

/**
 * Get binary name.
 * name: {platform}-{arch}-{v8 version}.node
 */
export function getBinaryName(): string {
  const platform = process.platform;
  const arch = process.arch;
  const nodeV8CppApiVersion = process.versions.modules;
  if (!process) throw new NotNodeJsError("global object");
  if (!platform) throw new NotNodeJsError("process.platform");
  if (!arch) throw new NotNodeJsError("process.arch");
  if (!process.versions.modules) throw new NotNodeJsError("process.versions.modules");

  return [platform, arch, nodeV8CppApiVersion, "binding.node"].join("-");
}

export function getBinaryPath(): string {
  return path.join(PREBUILD_DIR, getBinaryName());
}

export function mkdirBinary(): void {
  if (!fs.existsSync(PREBUILD_DIR)) {
    fs.mkdirSync(PREBUILD_DIR);
  }
}

export function ensureDirFromFilepath(filepath: string): void {
  const dirpath = path.dirname(filepath);
  if (!fs.existsSync(dirpath)) {
    fs.mkdirSync(dirpath, {recursive: true});
  }
}

/**
 * The output of node-gyp is not at a predictable path but various
 * depending on the OS.
 * Paths based on https://github.com/TooTallNate/node-bindings/blob/c8033dcfc04c34397384e23f7399a30e6c13830d/bindings.js#L36
 */
export function findBindingsFile(dirpath: string): string {
  const filepaths = [
    // In dirpath
    [dirpath, BLST_NODE],
    // node-gyp's linked version in the "build" dir
    [dirpath, "build", BLST_NODE],
    // node-waf and gyp_addon (a.k.a node-gyp)
    [dirpath, "build", "Debug", BLST_NODE],
    [dirpath, "build", "Release", BLST_NODE],
    // Debug files, for development (legacy behavior, remove for node v0.9)
    [dirpath, "out", "Debug", BLST_NODE],
    [dirpath, "Debug", BLST_NODE],
    // Release files, but manually compiled (legacy behavior, remove for node v0.9)
    [dirpath, "out", "Release", BLST_NODE],
    [dirpath, "Release", BLST_NODE],
    // Legacy from node-waf, node <= 0.4.x
    [dirpath, "build", "default", BLST_NODE],
    // Production "Release" buildtype binary (meh...)
    [dirpath, "compiled", "version", "platform", "arch", BLST_NODE],
    // node-qbs builds
    [dirpath, "addon-build", "release", "install-root", BLST_NODE],
    [dirpath, "addon-build", "debug", "install-root", BLST_NODE],
    [dirpath, "addon-build", "default", "install-root", BLST_NODE],
    // node-pre-gyp path ./lib/binding/{node_abi}-{platform}-{arch}
    [dirpath, "lib", "binding", "nodePreGyp", BLST_NODE],
  ].map((pathParts) => path.join(...pathParts));

  for (const filepath of filepaths) {
    if (fs.existsSync(filepath)) {
      return filepath;
    }
  }

  throw Error(`Could not find bindings file. Tried:\n${filepaths.join("\n")}`);
}

export class NotNodeJsError extends Error {
  constructor(missingItem: string) {
    super(`BLST bindings loader should only run in a NodeJS context: ${missingItem}`);
  }
}
