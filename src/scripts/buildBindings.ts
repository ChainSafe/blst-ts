import fs from "fs";
import { exec } from "child_process";
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
  await new Promise((resolve, reject): void => {
    const proc = exec(
      "./run.me",
      {
        timeout: 3 * 60 * 1000, // ms
        maxBuffer: 10e6, // bytes
        cwd: bindingsDirSrc,
      },
      (err, stdout, stderr) => {
        if (err) reject(err);
        else resolve(stdout.trim() || stderr);
      }
    );
    if (proc.stdout) proc.stdout.pipe(process.stdout);
    if (proc.stderr) proc.stderr.pipe(process.stderr);
  });

  // Copy built .node file to expected path
  ensureDirFromFilepath(binaryPath);
  fs.copyFileSync(bindingsSrc, binaryPath);

  // Make sure downloaded bindings work
  await testBindings(binaryPath);
}
