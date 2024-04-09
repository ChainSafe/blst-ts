import {resolve} from "path";
import {cpSync, readdirSync, rmSync} from "fs";
import {BINDINGS_FILE} from "../utils";

const RELEASE_FOLDER = resolve(__dirname, "..", "release");
const PREBUILD_FOLDER = resolve(__dirname, "..", "prebuild");

/**
 * Reads through the files in the PREBUILD_FOLDER.  Copies all to the
 * RELEASE_FOLDER and then deletes the ones that are not slated for publishing
 * to npm.  Only the currently supported version of node that lodestar uses
 * is included in the npm tarball.  The rest of the consumers will pull from
 * ths github release or have to build locally.
 */
for (const binding of readdirSync(PREBUILD_FOLDER)) {
  const prebuiltPath = resolve(PREBUILD_FOLDER, binding);
  cpSync(prebuiltPath, resolve(RELEASE_FOLDER, binding));
  if (!binding.endsWith(`-${process.versions.modules}-${BINDINGS_FILE}`)) {
    rmSync(prebuiltPath, {force: true});
  }
}
