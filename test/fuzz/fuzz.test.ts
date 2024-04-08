/* eslint-disable no-console */
import fs from "fs";
import {resolve} from "path";
import {PromiseWithChild} from "child_process";
import {testCases} from "./testCases";
import {exec} from "../../utils";

/**
 * Fuzz testing framework
 *
 * jazzer.js is the fuzzer that will run the test cases but it is limited to
 * fuzzing a single case at at time.  This script parallelizes the fuzzing to cut
 * down on test time.
 *
 * Each test case is run in its own child process.  This is because the fuzzer
 * must be run from the command line.  It plugs into the process itself to
 * check for segfault crashes which cannot be done from the application layer so
 * the library must be the entrance and it starts the node instance to run the
 * test cases.
 */

const ROOT_DIR = resolve(__dirname, "..", "..");
// timeout for all fuzz tests
const TEST_TIMEOUT_IN_MINUTES = 20;

if (!fs.existsSync(resolve(ROOT_DIR, "fuzz-tests", "test", "fuzz", "fuzzTarget.js"))) {
  throw new Error("fuzzTarget.js not found.  Run `yarn build:fuzz` to generate the fuzzing framework files");
}

if (!fs.existsSync(resolve(ROOT_DIR, "node_modules", ".bin", "jazzer"))) {
  throw new Error("optionalDependency jazzer not found.  Run `yarn install`");
}

/**
 * Setup of graceful exit for the child processes.  When this script is run by
 * the test:fuzz command it will be possible to ctrl+c to exit the script
 */
const testingProcesses: PromiseWithChild<string>[] = [];
async function exit(): Promise<void> {
  for (const testProcess of testingProcesses) {
    if (testProcess.child) {
      testProcess.child.kill("SIGINT");
    }
  }
  process.removeAllListeners("exit");
  process.removeAllListeners("SIGINT");
  clearTimeout(timeout);
}
// exit on hung processes
const timeout = setTimeout(exit, TEST_TIMEOUT_IN_MINUTES * 60 * 1000);
// catch uncaught exceptions, then exit gracefully to generate coverage reports
process.on("exit", exit);
// catch ctrl+c and exit gracefully to generate coverage reports
process.on("SIGINT", exit);

/**
 * Makes directories for test cases if they do not exist
 */
function makeDirs(...paths: string[]): void {
  for (const path of paths) {
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path, {recursive: true});
    }
  }
}

/**
 * Test cases are loaded from a separate file.  The testCases are loaded both by
 * the main process and by the child process that runs the test case to ensure
 * synchronization
 */
for (const testCase of testCases) {
  /**
   * corpusDir provides a baseline for the fuzzer so it knows what inputs have
   * already been tested to broaden the search space
   */
  const corpusDir = resolve(ROOT_DIR, "fuzz-tests", "corpus", testCase.name);
  const coverageDir = resolve(ROOT_DIR, "fuzz-tests", "coverage", testCase.name);
  makeDirs(corpusDir, coverageDir);

  const cmd = [
    /**
     * because the fuzzer library is what calls the node instance it was not possible
     * to pass the test case to the node instance directly.  Instead, the test case
     * is passed as an environment variable
     */
    `FUZZ_TEST_CASE=${testCase.name}`,
    "node_modules/.bin/jazzer",
    "fuzz-tests/test/fuzz/fuzzTarget",
    corpusDir,
    "--includes build",
    "--includes prebuild",
    "--includes src",
    "--includes fuzz-tests/lib",
    "--includes fuzz-tests/test",
    "--includes fuzz-tests/utils",
    "--excludes node_modules",
    "--mode fuzzing",
    "--timeout 1000", // individual test timeout. each run is max 1 second
    "--sync false",
    "--coverage true",
    `--coverage_directory ${coverageDir}`,
    "--coverage_reporters lcov",
    // "--",
    // "-max_total_time=10",
  ].join(" ");

  console.log(`Running fuzz test: ${testCase.name}`);
  testingProcesses.push(exec(cmd, true, {cwd: ROOT_DIR}));
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
Promise.allSettled(testingProcesses)
  .then((results) => {
    console.log("All fuzz tests completed");
    for (const result of results) {
      if (result.status === "rejected") {
        console.error(result.reason);
      }
    }
  })
  .finally(() => process.exit());
