import fs from "fs";
import {resolve} from "path";
import {PromiseWithChild} from "child_process";
import {testCases} from "./testCases";
import {cmdStringExec} from "../../tools/exec";

// timeout for all fuzz tests
const TEST_TIMEOUT_IN_MINUTES = 20;
const ROOT_DIR = resolve(__dirname, "..", "..");

const timeout = setTimeout(exit, TEST_TIMEOUT_IN_MINUTES * 60 * 1000);
// catch uncaught exceptions, then exit gracefully to generate coverage reports
process.on("exit", exit);
// catch ctrl+c and exit gracefully to generate coverage reports
process.on("SIGINT", exit);

const testingProcesses: PromiseWithChild<string>[] = [];
function exit(): void {
  for (const testProcess of testingProcesses) {
    if (testProcess.child) {
      testProcess.child.kill("SIGINT");
    }
  }
  process.removeAllListeners("exit");
  process.removeAllListeners("SIGINT");
  clearTimeout(timeout);
}

function makeDirs(...paths: string[]): void {
  for (const path of paths) {
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path, {recursive: true});
    }
  }
}

for (const testCase of testCases) {
  const corpusDir = resolve(ROOT_DIR, "dist", "fuzz", "corpus", testCase.name);
  const coverageDir = resolve(ROOT_DIR, "dist", "fuzz", "coverage", testCase.name);
  makeDirs(corpusDir, coverageDir);

  const cmd = [
    `FUZZ_TEST_CASE=${testCase.name}`,
    "node_modules/.bin/jazzer",
    "dist/fuzz/test/fuzz/fuzzTarget",
    corpusDir,
    "--includes build",
    "--includes deps",
    "--includes src",
    "--includes dist/lib",
    "--includes dist/test",
    "--excludes node_modules",
    "--mode fuzzing",
    "--timeout 1000", // individual test timeout. each run is max 1 second
    "--sync false",
    "--coverage true",
    `--coverage_directory ${coverageDir}`,
    "--coverage_reporters text",
    "--coverage_reporters lcov",
    "--coverage_reporters json",
    "--coverage_reporters clover",
  ].join(" ");

  testingProcesses.push(cmdStringExec(cmd, true, {cwd: ROOT_DIR}));
}

Promise.allSettled(testingProcesses)
  .then(() => console.log("All fuzz tests completed"))
  .catch(() => console.log("Some fuzz tests failed"));
