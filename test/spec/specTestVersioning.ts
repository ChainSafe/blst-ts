import {join} from "path";
import {DownloadTestsOptions} from "../../utils/downloadTests";

// WARNING! Don't move or rename this file !!!
//
// This file is used to generate the cache ID for spec tests download in Github Actions CI
// It's path is hardcoded in: `.github/workflows/test-spec.yml`
//
// The contents of this file MUST include the URL, version and target path, and nothing else.

// Target directory is the host package root: '<roo>/spec-tests'

export const ethereumConsensusSpecsTests: DownloadTestsOptions = {
  specVersion: "v1.4.0",
  // Target directory is the host package root: 'packages/*/spec-tests'
  outputDir: join(__dirname, "../../spec-tests"),
  specTestsRepoUrl: "https://github.com/ethereum/consensus-spec-tests",
  testsToDownload: ["general"],
};

export const blsSpecTests: DownloadTestsOptions = {
  specVersion: "v0.1.2",
  // Target directory is the host package root: 'packages/*/spec-tests-bls'
  outputDir: join(__dirname, "../../spec-tests-bls"),
  specTestsRepoUrl: "https://github.com/ethereum/bls12-381-tests",
  testsToDownload: ["bls_tests_yaml"],
};
