/* eslint-disable @typescript-eslint/no-unsafe-return */
import {testCases} from "./testCases";

const TEST_CASE = process.env.FUZZ_TEST_CASE;
const testCase = testCases.find(({name}) => name === TEST_CASE);
if (!testCase) {
  throw new Error(`Unknown test case: ${TEST_CASE}`);
}

export async function fuzz(data: Buffer): Promise<any> {
  try {
    const response = testCase?.target(data);
    if (response instanceof Promise) {
      return await response;
    }
    return response;
  } catch (e: unknown) {
    if (e instanceof Error && testCase?.expectedErrors.includes(e.message)) {
      return;
    }
    throw e;
  }
}
