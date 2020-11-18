import fs from "fs";
import path from "path";

const rootDir = path.join(__dirname, "../..");

export const packageJsonPath = path.join(rootDir, "package.json");

export const bindingsDirSrc = path.join(rootDir, "blst/bindings/node.js");
export const prebuiltSwigSrc = path.join(rootDir, "prebuild/blst_wrap.cpp");
export const prebuiltSwigTarget = path.join(bindingsDirSrc, "blst_wrap.cpp");
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
