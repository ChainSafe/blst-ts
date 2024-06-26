/* eslint-disable no-console */
import fs from "fs";
import {resolve} from "path";
import {watchWithCallback} from "./watch";
import {exec} from "../utils";

const DEBOUNCE_TIME = 500;
const testCommand = "npm run test:unit && npm run test:spec";
const buildCommand = "npm run build:gyp:debug";

const ROOT_FOLDER = resolve(__dirname, "..");
const SRC_FOLDER = resolve(ROOT_FOLDER, "src");
const TESTS_FOLDER = resolve(ROOT_FOLDER, "test");

// make sure code is using most recently built bindings
try {
  fs.rmdirSync(resolve(ROOT_FOLDER, "prebuild"));
} catch {
  /* no-op, doesn't exist */
}

/**
 * Builds addon and then starts watch.
 * Watches src/addon folder and rerun compile on file changes
 */
void watchWithCallback({
  path: SRC_FOLDER,
  debounceTime: DEBOUNCE_TIME,
  cb: () =>
    exec(buildCommand, false)
      .then(console.log)
      // timeout set if undefined behavior creeps in.  keeps from hung tests
      .then(() => exec(testCommand, false, {timeout: 20 * 1000}))
      .then(console.log)
      .catch(console.error),
});

void watchWithCallback({
  path: TESTS_FOLDER,
  debounceTime: DEBOUNCE_TIME,
  cb: () => exec(testCommand, false).then(console.log).catch(console.error),
});
