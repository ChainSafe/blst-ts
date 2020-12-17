import fs from "fs";
import { exec } from "./exec";
import { testBindings } from "./testBindings";
import { assertSupportedSwigVersion } from "./swig";
import {
  bindingsDirSrc,
  ensureDirFromFilepath,
  prebuiltSwigSrc,
  prebuiltSwigTarget,
  findBindingsFile,
} from "./paths";

export async function buildBindings(binaryPath: string) {
  // Make sure SWIG generated bindings are available or download from release assets
  if (process.env["SWIG_SKIP_RUN"]) {
    console.log(
      `Copying prebuild SWIG output from ${prebuiltSwigSrc} to ${prebuiltSwigTarget}`
    );
    fs.copyFileSync(prebuiltSwigSrc, prebuiltSwigTarget);
  } else {
    await assertSupportedSwigVersion();
    console.log("Building bindings from src");
  }

  // Use BLST run.me script to build libblst.a + blst.node
  await exec("node-gyp rebuild", { cwd: bindingsDirSrc });

  // The output of node-gyp is not at a predictable path but various
  // depending on the OS.
  const bindingsFileOutput = findBindingsFile(bindingsDirSrc);

  // Copy built .node file to expected path
  ensureDirFromFilepath(binaryPath);
  fs.copyFileSync(bindingsFileOutput, binaryPath);

  // Make sure downloaded bindings work
  await testBindings(binaryPath);
}
