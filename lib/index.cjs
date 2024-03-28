/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
const {resolve} = require("path");
const {getBindingsPath} = require("../utils");
const {prepareBindings} = require("./bindings");

/**
 * Need to support testing and productions environments. Prod is the first case
 * where the entrance file is PACKAGE_ROOT/dist/cjs/lib/index.js.  In the
 * bundled case the bindings file is copied/built to PACKAGE_ROOT/prebuild. For
 * testing (not fuzz tests) the entrance file is REPO_ROOT/lib/index.js and the
 * bindings file is built/copied to REPO_ROOT/prebuild. For fuzz testing the
 * entrance file is in REPO_ROOT/fuzz-test/lib/index.js and the bindings file
 * does not get copied and is still in REPO_ROOT/prebuild.
 */
const rootDir = __dirname.includes("dist/cjs")
  ? resolve(__dirname, "..", "..", "..")
  : __dirname.includes("fuzz-tests")
    ? resolve(__dirname, "..", "..")
    : resolve(__dirname, "..");
const bindingsPath = getBindingsPath(rootDir);
module.exports = prepareBindings(require(bindingsPath));
