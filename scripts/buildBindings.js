const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { promisify } = require("util");
const { getBinaryPath, mkdirBinary } = require("./paths");
const { testBindings } = require("./testBindings");

const bindingsDirSrc = path.join(__dirname, "../blst/bindings/node.js");
const prebuiltSwigSrc = path.join(__dirname, "../prebuild/blst_wrap.cpp");
const prebuiltSwigTarget = path.join(bindingsDirSrc, "blst_wrap.cpp");
const bindingsSrc = path.join(bindingsDirSrc, "blst.node");

module.exports.buildBindings = async function buildBindings(binaryPath) {
  // Copy SWIG prebuilt
  fs.copyFileSync(prebuiltSwigSrc, prebuiltSwigTarget);

  // Use BLST run.me script to build libblst.a + blst.node
  console.log("Building BLST native bindings from source...");
  const res = await promisify(exec)("./run.me", {
    cwd: bindingsDirSrc,
    maxBuffer: 1024 * 1024 * 1024,
    timeout: 60 * 1000,
  });
  if (res.stderr) console.log(res.stderr);
  if (res.stdout) console.log(res.stdout);
  console.log("Built BLST native bindings from source");

  // Copy built .node file to expected path
  mkdirBinary();
  fs.copyFileSync(bindingsSrc, binaryPath);

  // Make sure downloaded bindings work
  await testBindings();
};
