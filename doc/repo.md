# The `blst-ts` Repository

## Organization

Some research was done looking through [this list](https://www.npmjs.com/browse/depended/node-addon-api) of projects that have built node bindings.  Many use a similar structure to `nodejs/node` so this repo is structured similarly.

| folder | contents |
|---|---|
| `.github` | github integration files |
| `.vscode` | vscode helper files |
| `benchmark` | benchmarking for the library |
| `deps` | native dependencies |
| `doc` | documentation |
| `src` | c/c++ (or other c-export format compatible) code |
| `lib` | js/ts wrapper code |
| `test` | unit/spec/memory-leak testing and test fixtures |
| `tools` | repo tools and scripts written in TypeScript |

## Scripts

There are a number of scripts to help while working in this repo.  The first two are the most important to be familiar with.

| folder | contents |
|---|---|
`dev` | Watches files and re-runs `build/test` as appropriate
`download-spec-tests` | Pulls the official ethereum spec tests
`build` | Runs `node-gyp` in `Release` mode
`build:debud` | Runs `node-gyp` in `Debug` mode
`build:clean` | Runs `clean` and then runs a full `build`
`test` | Runs unit, spec and performance tests
`test:unit` | Runs unit tests
`test:spec` | Runs spec tests
`test:perf` | Runs performance tests

## Dependencies

There are a few dependencies, however, most will be installed by `yarn`

```sh
yarn install
```

The only one that needs to be explicitly handled is `blst` which is installed as a submodule

```sh
git submodule update --init
```
