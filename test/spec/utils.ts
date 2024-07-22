import fs from "node:fs";
import path from "node:path";
import stream from "node:stream";
import type {ReadableStream} from "node:stream/web";
import * as tar from "tar";
import jsYaml from "js-yaml";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
export const SPEC_TEST_REPO_URL = "https://github.com/ethereum/consensus-spec-tests";

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
    if (!fs.statSync(testDirectory).isDirectory()) {
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

const logEmpty = (): void => {};

export type DownloadTestsOptions = {
  specVersion: string;
  outputDir: string;
  /** Root Github URL `https://github.com/ethereum/consensus-spec-tests` */
  specTestsRepoUrl: string;
  /** Release files names to download without prefix `["general", "mainnet", "minimal"]` */
  testsToDownload: string[];
};

/**
 * Generic Github release downloader.
 * Used by spec tests and SlashingProtectionInterchangeTest
 */
export async function downloadTests(
  {specVersion, specTestsRepoUrl, outputDir, testsToDownload}: DownloadTestsOptions,
  log: (msg: string) => void = logEmpty
): Promise<void> {
  log(`outputDir = ${outputDir}`);

  // Use version.txt as a flag to prevent re-downloading the tests
  const versionFile = path.join(outputDir, "version.txt");
  const existingVersion = fs.existsSync(versionFile) && fs.readFileSync(versionFile, "utf8").trim();

  if (existingVersion === specVersion) {
    return log(`version ${specVersion} already downloaded`);
  } else {
    log(`Downloading new version ${specVersion}`);
  }

  if (fs.existsSync(outputDir)) {
    log(`Cleaning existing version ${existingVersion} at ${outputDir}`);
    fs.rmSync(outputDir, {recursive: true, force: true});
  }

  fs.mkdirSync(outputDir, {recursive: true});

  await Promise.all(
    testsToDownload.map(async (test) => {
      const url = `${specTestsRepoUrl ?? SPEC_TEST_REPO_URL}/releases/download/${specVersion}/${test}.tar.gz`;
      const fileName = url.split("/").pop();
      const filePath = path.resolve(outputDir, String(fileName));
      const {body, ok, headers} = await fetch(url);
      if (!ok || !body) {
        throw new Error(`Failed to download ${url}`);
      }

      const totalSize = headers.get("content-length");
      log(`Downloading ${url} - ${totalSize} bytes`);

      await stream.promises.finished(
        stream.Readable.fromWeb(body as ReadableStream<Uint8Array>).pipe(fs.createWriteStream(filePath))
      );

      log(`Downloaded  ${url}`);

      await tar.x({
        file: filePath,
        cwd: outputDir,
      });
    })
  );

  fs.writeFileSync(versionFile, specVersion);
}
