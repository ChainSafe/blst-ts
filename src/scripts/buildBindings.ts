import fs from "fs";
import path from "path";
import {exec} from "./exec";
import {testBindings} from "./testBindings";
import {assertSupportedSwigVersion} from "./swig";
import {BINDINGS_DIR, BLST_WRAP_CPP_PREBUILD} from "./paths";
import {ensureDirFromFilepath, findBindingsFile} from "./paths_node";

/* eslint-disable no-console */

export async function buildBindings(binaryPath: string): Promise<void> {
  if (process.env.BLST_WRAP_CPP_FORCE_BUILD && fs.existsSync(BLST_WRAP_CPP_PREBUILD)) {
    console.log(`BLST_WRAP_CPP_FORCE_BUILD=true, cleaning existing BLST_WRAP_CPP_PREBUILD ${BLST_WRAP_CPP_PREBUILD}`);
    fs.unlinkSync(BLST_WRAP_CPP_PREBUILD);
  }

  // Make sure SWIG generated bindings are available or download from release assets
  if (fs.existsSync(BLST_WRAP_CPP_PREBUILD)) {
    console.log(`BLST_WRAP_CPP_PREBUILD ${BLST_WRAP_CPP_PREBUILD} exists, SWIG will be skipped`);
  } else {
    if (process.env.SWIG_SKIP_RUN) {
      throw Error(`Prebuild SWIG not found ${BLST_WRAP_CPP_PREBUILD}`);
    } else {
      await assertSupportedSwigVersion();
      console.log("Building bindings from src");
    }
  }

  // From https://github.com/sass/node-sass/blob/769f3a6f5a3949bd8e69c6b0a5d385a9c07924b4/scripts/build.js#L59
  const nodeJsExec = process.execPath;
  const nodeGypExec = require.resolve(path.join("node-gyp", "bin", "node-gyp.js"));

  console.log("Launching node-gyp", {
    nodeJsExec,
    nodeGypExec,
    cwd: BINDINGS_DIR,
    BLST_WRAP_CPP_PREBUILD,
  });

  await exec(nodeJsExec, [nodeGypExec, "rebuild"], {
    cwd: BINDINGS_DIR,
    timeout: 10 * 60 * 1000,
    env: {...process.env, BLST_WRAP_CPP_PREBUILD},
  });

  // The output of node-gyp is not at a predictable path but various
  // depending on the OS.
  const bindingsFileOutput = findBindingsFile(BINDINGS_DIR);

  // Copy built .node file to expected path
  ensureDirFromFilepath(binaryPath);
  fs.copyFileSync(bindingsFileOutput, binaryPath);

  // Make sure downloaded bindings work
  await testBindings(binaryPath);
}
