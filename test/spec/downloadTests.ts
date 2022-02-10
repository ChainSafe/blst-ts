import {downloadTests} from "@chainsafe/lodestar-spec-test-util";
import {SPEC_TEST_LOCATION, SPEC_TEST_VERSION, SPEC_TEST_REPO_URL, SPEC_TEST_TO_DOWNLOAD} from "./specTestVersioning";

/* eslint-disable no-console */

downloadTests(
  {
    testsToDownload: SPEC_TEST_TO_DOWNLOAD,
    specVersion: SPEC_TEST_VERSION,
    outputDir: SPEC_TEST_LOCATION,
    specTestsRepoUrl: SPEC_TEST_REPO_URL,
  },
  console.log
).catch((e: Error) => {
  console.error(e);
  process.exit(1);
});
