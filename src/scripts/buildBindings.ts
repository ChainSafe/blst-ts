import fs from "fs";
import path from "path";
import { exec } from "./exec";
import { testBindings } from "./testBindings";
import { assertSupportedSwigVersion } from "./swig";
import {
  ensureDirFromFilepath,
  findBindingsFile,
  BINDINGS_DIR,
  BLST_WRAP_CPP_TARGET,
  BLST_WRAP_PY_PATCH,
  BLST_WRAP_PY_FILE,
  BINDING_GYP_PATCH,
  BINDING_GYP_FILE,
} from "./paths";

export async function buildBindings(binaryPath: string) {
  // Make sure SWIG generated bindings are available or download from release assets
  if (fs.existsSync(BLST_WRAP_CPP_TARGET)) {
    console.log(
      `BLST_WRAP_CPP_TARGET ${BLST_WRAP_CPP_TARGET} exists, SWIG will be skipped`
    );
  } else {
    if (process.env.SWIG_SKIP_RUN) {
      throw Error(`Prebuild SWIG not found ${BLST_WRAP_CPP_TARGET}`);
    } else {
      await assertSupportedSwigVersion();
      console.log("Building bindings from src");
    }
  }

  // Copy patched blst_wrap.py and bindings.gyp
  fs.copyFileSync(BLST_WRAP_PY_PATCH, BLST_WRAP_PY_FILE);
  fs.copyFileSync(BINDING_GYP_PATCH, BINDING_GYP_FILE);

  // Use BLST run.me script to build libblst.a + blst.node
  const nodeJsExec = process.execPath;
  const nodeGypExec = require.resolve(
    path.join("node-gyp", "bin", "node-gyp.js")
  );

  await exec(nodeJsExec, [nodeGypExec, "rebuild"], {
    cwd: BINDINGS_DIR,
    env: { BLST_WRAP_CPP_TARGET },
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
