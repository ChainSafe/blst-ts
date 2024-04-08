import {cpSync, mkdirSync, readdirSync, rmSync} from "fs";
import {resolve} from "path";
import {BINDINGS_FILE} from "../utils";

const PREBUILD_FOLDER = resolve(__dirname, "..", "prebuild");
const RELEASE_FOLDER = resolve(__dirname, "..", "release");

cpSync(PREBUILD_FOLDER, RELEASE_FOLDER, {recursive: true});
rmSync(PREBUILD_FOLDER, {recursive: true, force: true});
mkdirSync(PREBUILD_FOLDER);

const prebuilds = readdirSync(RELEASE_FOLDER);

for (const binding of prebuilds) {
  if (binding.endsWith(`-${process.versions.modules}-${BINDINGS_FILE}`)) {
    cpSync(resolve(RELEASE_FOLDER, binding), resolve(PREBUILD_FOLDER, binding));
  }
}
