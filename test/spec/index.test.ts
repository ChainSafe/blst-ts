/* eslint-disable no-console */
import {expect} from "chai";
import fs from "fs";
import path from "path";
import jsYaml from "js-yaml";
import {SPEC_TEST_LOCATION} from "./specTestVersioning";
import {
  PublicKey,
  SecretKey,
  Signature,
  aggregatePublicKeys,
  aggregateSignatures,
  verify as VERIFY,
  aggregateVerify,
  fastAggregateVerify,
} from "../../index.js";
import {fromHex} from "../utils/index";
import {TestBatchMeta, getTestBatch} from "./utils";
import { testFnByName } from "./functions";

const testLocations: TestBatchMeta[] = [
  {directory: "spec-tests/tests/general/phase0/bls", innerBlsFolder: true},
  {directory: "spec-tests/tests/general/altair/bls", innerBlsFolder: true},
  {directory: "spec-tests-bls", namedYamlFiles: true},
];

const G2_POINT_AT_INFINITY =
  "0xc00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

const skippedTestCaseNames: string[] = [
  // TODO: BLS dealing of the Infinity public key does not allow to validate `infinity_with_true_b_flag`.
  // This _should_ not have any impact of Beacon Chain in production, so it's ignored until fixed upstream
  "deserialization_succeeds_infinity_with_true_b_flag",
];


(function runTests(): void {
  const batches = testLocations.map(getTestBatch);
  for (const {directory, testGroups: tests} of batches) {
    describe(directory, () => {
      for (const {functionName, testCases} of tests) {
        if (skippedFunctions.includes(functionName)) continue;
        describe(functionName, () => {
          const testFn = testFnByName[functionName];
          before("Must be a known test function", () => {
            if (!testFn) throw Error(`Unknown test function: ${functionName}`);
          });

          for (const {testCaseName, testCaseData} of testCases) {
            if (skippedTestCaseNames.includes(testCaseName)) {
              continue;
            }
            if (process.env.DEBUG) {
              console.log(testCaseData);
            }
            it(testCaseName, () => {
              if (testCaseData.output === null) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                expect(() => testFn(testCaseData.input)).to.throw();
              } else {
                expect(testFn(testCaseData.input)).to.deep.equal(testCaseData.output);
              }
            });
          }
        });
      }
    });
  }
})();

function isBlstError(e: unknown): boolean {
  return ((e as {code?: string}).code ?? "").startsWith("BLST");
}
