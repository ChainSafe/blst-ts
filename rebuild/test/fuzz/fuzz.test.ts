/* eslint-disable @typescript-eslint/no-unsafe-return */
import {testCases} from "./testCases";

// const TEST_CASE = process.argv[2];
// const testCase = testCases.find(({name}) => name === TEST_CASE);
// if (!testCase) {
// if (!testCase) {
//   throw new Error(`Unknown test case: ${TEST_CASE}`);
// }

describe("fuzz", () => {
  for (const {name, target} of testCases) {
    test.fuzz(name, (data: Buffer) => target(data));
  }
});
