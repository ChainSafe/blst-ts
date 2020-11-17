import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { testBindings } from "./testBindings";
import {
  bindingsDirSrc,
  bindingsSrc,
  ensureDirFromFilepath,
  prebuiltSwigSrc,
  prebuiltSwigTarget,
} from "./paths";

export async function buildBindings(binaryPath: string) {
  // Copy SWIG prebuilt
  fs.copyFileSync(prebuiltSwigSrc, prebuiltSwigTarget);

  // Use BLST run.me script to build libblst.a + blst.node
  const res = await promisify(exec)("./run.me", {
    cwd: bindingsDirSrc,
    maxBuffer: 1024 * 1024 * 1024,
    timeout: 60 * 1000,
  });
  if (res.stderr) console.log(res.stderr);
  if (res.stdout) console.log(res.stdout);

  // Copy built .node file to expected path
  ensureDirFromFilepath(binaryPath);
  fs.copyFileSync(bindingsSrc, binaryPath);

  // Make sure downloaded bindings work
  await testBindings(binaryPath);
}
