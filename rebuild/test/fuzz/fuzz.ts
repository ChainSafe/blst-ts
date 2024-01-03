import {PromiseWithChild} from "child_process";
import {testCases} from "./testCases";
import {cmdStringExec} from "../../tools/exec";

const TEST_TIMEOUT = 10 * 60 * 1000;
const PROCESS_ENV = {JAZZER_FUZZ: "1"};

const processes: PromiseWithChild<string>[] = [];
function exit(): void {
  for (const process of processes) {
    if (process.child) {
      process.child.kill();
    }
  }
}

for (const testCase of testCases) {
  processes.push(cmdStringExec(`jest --testNamePattern="${testCase.name}"`, false, {env: PROCESS_ENV}));
}

process.on("exit", exit);

Promise.allSettled(processes)
  .then(() => console.log("All fuzz tests completed"))
  .catch(() => console.log("Some fuzz tests failed"));

setTimeout(exit, TEST_TIMEOUT);
