import fs from "fs";
import path from "path";

const rootDir = path.join(__dirname, "../..");
const bindingsName = "blst.node";

export const packageJsonPath = path.join(rootDir, "package.json");

export const bindingsDirSrc = path.join(rootDir, "blst/bindings/node.js");
export const blstWrapCppName = "blst_wrap.cpp";
export const prebuiltSwigSrc = path.join(rootDir, "prebuild", blstWrapCppName);
export const prebuiltSwigTarget = path.join(bindingsDirSrc, blstWrapCppName);

export const defaultBinaryDir = path.join(rootDir, "prebuild");

/**
 * Get binary name.
 * name: {platform}-{arch}-{v8 version}.node
 */
export function getBinaryName() {
  const platform = process.platform;
  const arch = process.arch;
  const nodeV8CppApiVersion = process.versions.modules;
  if (!process) throw new NotNodeJsError("global object");
  if (!platform) throw new NotNodeJsError("process.platform");
  if (!arch) throw new NotNodeJsError("process.arch");
  if (!process.versions.modules)
    throw new NotNodeJsError("process.versions.modules");

  return [platform, arch, nodeV8CppApiVersion, "binding.node"].join("-");
}

export function getBinaryPath() {
  return path.join(defaultBinaryDir, getBinaryName());
}

export function mkdirBinary() {
  if (!fs.existsSync(defaultBinaryDir)) {
    fs.mkdirSync(defaultBinaryDir);
  }
}

export function ensureDirFromFilepath(filepath: string) {
  const dirpath = path.dirname(filepath);
  if (!fs.existsSync(dirpath)) {
    fs.mkdirSync(dirpath, { recursive: true });
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
    [dirpath, bindingsName],
    // node-gyp's linked version in the "build" dir
    [dirpath, "build", bindingsName],
    // node-waf and gyp_addon (a.k.a node-gyp)
    [dirpath, "build", "Debug", bindingsName],
    [dirpath, "build", "Release", bindingsName],
    // Debug files, for development (legacy behavior, remove for node v0.9)
    [dirpath, "out", "Debug", bindingsName],
    [dirpath, "Debug", bindingsName],
    // Release files, but manually compiled (legacy behavior, remove for node v0.9)
    [dirpath, "out", "Release", bindingsName],
    [dirpath, "Release", bindingsName],
    // Legacy from node-waf, node <= 0.4.x
    [dirpath, "build", "default", bindingsName],
    // Production "Release" buildtype binary (meh...)
    [dirpath, "compiled", "version", "platform", "arch", bindingsName],
    // node-qbs builds
    [dirpath, "addon-build", "release", "install-root", bindingsName],
    [dirpath, "addon-build", "debug", "install-root", bindingsName],
    [dirpath, "addon-build", "default", "install-root", bindingsName],
    // node-pre-gyp path ./lib/binding/{node_abi}-{platform}-{arch}
    [dirpath, "lib", "binding", "nodePreGyp", bindingsName],
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
    super(
      `BLST bindings loader should only run in a NodeJS context: ${missingItem}`
    );
  }
}
