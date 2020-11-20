import fs from "fs";
import path from "path";

const rootDir = path.join(__dirname, "../..");

export const packageJsonPath = path.join(rootDir, "package.json");

export const bindingsDirSrc = path.join(rootDir, "blst/bindings/node.js");
export const blstWrapCppName = "blst_wrap.cpp";
export const prebuiltSwigSrc = path.join(rootDir, "prebuild", blstWrapCppName);
export const prebuiltSwigTarget = path.join(bindingsDirSrc, blstWrapCppName);
export const bindingsSrc = path.join(bindingsDirSrc, "blst.node");

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

export class NotNodeJsError extends Error {
  constructor(missingItem: string) {
    super(
      `BLST bindings loader should only run in a NodeJS context: ${missingItem}`
    );
  }
}
