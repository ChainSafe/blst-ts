# Contributing

## Welcome

Thank you for your interest in contribution to the `blst-ts` project.  This file will serve as your guide using the repo and some of the nuances of the architecture used within

### Scripts

#### `dev`

Helper function for iterative development. First deletes the `prebuild` folder to make sure the most current version of bindings are being used. Then sets up file watchers to monitor changes in the `src` and `test` folders.  For changes in `src` the code is compiled via `node-gyp` and then the unit tests are run against the freshly compiled binary.  For `test` changes, only the tests are rerun.

#### `download-spec-tests`

Pulls the spec test from the `ethereum/consensus-spec` repo and puts them in the `spec-tests` folder.

#### `test:unit`

Runs the unit tests in `test/unit` via mocha

#### `test:spec`

Runs the unit tests in `test/spec` via mocha.  It is important do download the spec tests before running this.

#### `test:memory`

Runs a test rig for creating thousands of object instances to get a mean-reversion value for the memory consumed by a single instance.

#### `test:perf`

Uses `@dapplion/benchmark` to run the test in `test/perf`.  Results from these tests are posted to PR bodies and checked against the values on `master` to make sure there are no regressions and to highlight significant performance increases.

## Background for Installation and Publishing Workflows

It is necessary for node-gyp to compile the native code for each combination os architecture and node version.  When compilation happens the file is output to one of a few places depending on what flags are passed to the build process. Generally node-gyp places the build configuration and artifacts in the `build` folder.  For release builds the assemblies are output to `build/Release` and for debug builds they go to `build/Debug`.  There are lots of intermediate assemblies in those folders but the one that is most important is the final assembled compilation artifact, the `.node` file.  This is the one that can be `require()` in a JS file.

`node-gyp` names the final binary the same as the `target_name` in the `binding.gyp` file.  In our case that is `blst_ts_addon.node`.  So it will usually be found in `build/Release/blst_ts_addon.node`.  This is the default development case.

There is another case that needs to be handled however. Production. It is not great to rely on consumers to have build tooling on their machines. Even if they are present they can often need to be configured to make `node-gyp` happy. This has been a common issue in our discord previously because the base `supranational/blst` build process has a hard request to `python`, [seen here](https://github.com/supranational/blst/blob/704c7f6d5f99ebb6bda84f635122e449ee51aa48/bindings/node.js/binding.gyp#L37), and not `python3` which is now standard on most computers. While this issue was resolved by building this project there are others that come up.

To make lives easier it is common for native module developers to include pre-built bindings with the package downloaded from npm.  They often include several versions of the bindings and a fall back to building locally if an appropriate version is not in the published module.  This package does the same.

We test the bindings for a number of platforms and node combinations in CI and thus build a number of versions of the bindings. However, if we were to publish all of them in the `prebuild` folder the downloaded tarball from npm will be very big. Ultimately only one version of the bindings will be relevant to any user at a given time because they generally never change their cpu architecture (would be funny to watch this surgery though) nor node version between runs of `npm install`.

To solve for this inefficiency we only should include some of the compiled binaries.  We have selected to include all architectures for the current version of node. As a courtesy, and way to cut down on installation bugs, we publish the rest of the bindings combinations that CI built to a github release.  This way the vast majority of os/node combinations will have a binary available and will not need to have build tooling installed (python, gcc, make, etc are used under the hood by node-gyp).

## How to `require` Bindings

To accommodate both development and production environments we have built some tooling to help wih `require()`.  As mentioned above the build artifacts can be placed in a couple of places and we also want to support `prebuild` of bindings for consumers.  To help make sure a binding can be found at runtime we programmatically standardize the name and location of where the bindings are imported from.

For development we need to look in the `build` folder and for production we need to look in the `prebuild` folder.  We also need to handle the case where the file is named by `node-gyp` and where the file is named so the many versions can coexist in a single `prebuild` folder. This is standardized by the `getBindingsPath()` and `getBinaryName()` helper functions.

## Installation Flow

When running `npm install` in a consuming library the `node_modules` will first be downloaded, and then the `install` script in the `package.json` is run by npm/yarn. The first thing the install script does is attempt to use a binding in the `prebuild` folder.  If one is not available then we attempt to download the correct version from the github release.  If a compatible version is not found there then the script falls back to running `node-gyp` and building the binding locally.

There is a test that we run after each step to check that the binding can successfully be imported/required by node.  If the import throws, we go to the next step in the flow.

For both the download step and the build step, the binary is placed in the `prebuild` folder and renamed accordingly.  That way it will be easily accessible at runtime by the `lib`.

## Development and Testing

After cloning the repo, run `yarn install` to install deps and build the bindings for the first time.  This will place them in the `prebuild` folder.  During iterative development though this may not be ideal because the `getBindingsPath()` resolves the `prebuild` version before the `build` versions (more common case during production).

For this reason it is important to delete the `prebuild` folder during development so that you are testing against the newly built code.  While doing iterative development one can run the `dev` script in the package.json. This will delete `prebuild`, watch the `src` and `test` code and rerun compilation and unit tests on changes.

Native development is not like JS and segfaults are HARD to find. It's best to run unit tests after each change to help identify problem code EARLY.

## Publishing

A github release, and an npm package are prepared and published via our CI workflow.  The trigger for publishing is merging a version change in the package.json to `master`.  When the CI picks up the change to the package.json `version` it creates a tag, assembles and publishes a release, and assembles and publishes an npm package.

The CI testing process runs a matrix of os and node versions to ensure broad compatibility. When the job runs `yarn install` the `node_modules` are all downloaded and the `install` script is run. Because the `prebuild` folder is in `.gitignore` the install script will fall back to building the bindings locally (for the job's current architecture and node version) and move it to the `prebuild` folder using the correct naming convention laid out in `getBinaryName()`.  The bindings are then tested against the `unit` and `spec` tests.  At the end of a run for a given architecture the `prebuild/*.node` is cached for use by the publish job.

When the trigger condition (merge to `master`) is met the publish flow will restore the `prebuild` folder from cache with the several bindings in it (all named appropriately). At this point, if `npm publish` was run ALL of the pre-build binaries would be included in the npm bundle which is not ideal.

To avoid this `scripts/makeRelease.ts` copies all of the bindings to the `release` folder and then selectively deletes, from the `prebuild` folder, bindings that are not for the current node versions. At the end of running the script all bindings will be in `release` and only the bindings that will get published to npm are in the `prebuild` folder.

The workflow then creates the release and includes `release` assets to the release and publishes the npm package with only the `prebuild` bindings that were selected for inclusion.

The workflow has a variable `env.NPM_PREBUILT_NODE_VERSION` for setting the currently bundled version and this generally should match the currently supported version of node that `@chainsafe/lodestar` uses.
