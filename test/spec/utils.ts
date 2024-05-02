import fs, {statSync} from "fs";
import path from "path";
import jsYaml from "js-yaml";

const REPO_ROOT = path.resolve(__dirname, "..", "..");

export const G2_POINT_AT_INFINITY =
  "0xc00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";
export const G1_POINT_AT_INFINITY =
  "0xc00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000";

// Examples of parsed YAML
// {
//   input: [
//     '0x91347bccf740d859038fcdcaf233eeceb2a436bcaaee9b2aa3bfb70efe29dfb2677562ccbea1c8e061fb9971b0753c240622fab78489ce96768259fc01360346da5b9f579e5da0d941e4c6ba18a0e64906082375394f337fa1af2b7127b0d121',
//     '0x9674e2228034527f4c083206032b020310face156d4a4685e2fcaec2f6f3665aa635d90347b6ce124eb879266b1e801d185de36a0a289b85e9039662634f2eea1e02e670bc7ab849d006a70b2f93b84597558a05b879c8d445f387a5d5b653df',
//     '0xae82747ddeefe4fd64cf9cedb9b04ae3e8a43420cd255e3c7cd06a8d88b7c7f8638543719981c5d16fa3527c468c25f0026704a6951bde891360c7e8d12ddee0559004ccdbe6046b55bae1b257ee97f7cdb955773d7cf29adf3ccbb9975e4eb9'
//   ],
//   output: '0x9712c3edd73a209c742b8250759db12549b3eaf43b5ca61376d9f30e2747dbcf842d8b2ac0901d2a093713e20284a7670fcf6954e9ab93de991bb9b313e664785a075fc285806fa5224c82bde146561b446ccfc706a64b8579513cfc4ff1d930'
// }
//
// {
//   input: ['0x000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'],
//   output: null
// }
//
// {
//   input: ...,
//   output: false
// }
export interface TestCaseData {
  input: unknown;
  output: unknown;
}

export interface TestCase {
  testCaseName: string;
  testCaseData: TestCaseData;
}

export interface TestGroup {
  functionName: string;
  directory: string;
  testCases: TestCase[];
}

export interface TestBatchMeta {
  directory: string;
  innerBlsFolder?: boolean;
  namedYamlFiles?: boolean;
}

export interface TestBatch {
  directory: string;
  testGroups: TestGroup[];
}

function getTestCasesWithDataYaml(testDirectory: string): TestCase[] {
  const testCases: TestCase[] = [];
  for (const testCaseName of fs.readdirSync(testDirectory)) {
    const testCaseDir = path.resolve(testDirectory, testCaseName);
    const yamlPath = path.resolve(testCaseDir, "data.yaml");
    if (!fs.existsSync(yamlPath)) {
      throw new Error(`Missing yaml data for ${testCaseDir}`);
    }
    testCases.push({
      testCaseName,
      testCaseData: jsYaml.load(fs.readFileSync(yamlPath, "utf8")) as {
        input: unknown;
        output: unknown;
      },
    });
  }
  return testCases;
}

function getTestCasesWithNamedYaml(testDirectory: string): TestCase[] {
  const testCases: TestCase[] = [];
  for (const testCaseYaml of fs.readdirSync(testDirectory)) {
    const [testCaseName] = testCaseYaml.split(".");
    const yamlPath = path.resolve(testDirectory, testCaseYaml);
    if (!fs.existsSync(yamlPath)) {
      throw new Error(`Missing yaml data for ${testCaseName}`);
    }
    testCases.push({
      testCaseName,
      testCaseData: jsYaml.load(fs.readFileSync(yamlPath, "utf8")) as {
        input: unknown;
        output: unknown;
      },
    });
  }
  return testCases;
}

export function getTestBatch({directory, innerBlsFolder, namedYamlFiles}: TestBatchMeta): TestBatch {
  const testBatch: TestBatch = {directory, testGroups: []};

  const fullDirPath = path.resolve(REPO_ROOT, directory);
  for (const functionName of fs.readdirSync(fullDirPath)) {
    const pathSegments = [fullDirPath, functionName];
    if (innerBlsFolder) pathSegments.push("bls");
    const testDirectory = path.resolve(...pathSegments);
    if (!statSync(testDirectory).isDirectory()) {
      continue;
    }
    const testGroup: TestGroup = {
      functionName,
      directory,
      testCases: namedYamlFiles ? getTestCasesWithNamedYaml(testDirectory) : getTestCasesWithDataYaml(testDirectory),
    };
    testBatch.testGroups.push(testGroup);
  }

  return testBatch;
}

export function isBlstError(e: unknown): boolean {
  return (e as Error).message.includes("BLST_ERROR");
}
