# blst-ts

![ETH2.0_Spec_Version 0.12.0](https://img.shields.io/badge/ETH2.0_Spec_Version-0.12.0-2e86c1.svg)
![ES Version](https://img.shields.io/badge/ES-2017-yellow)
![Node Version](https://img.shields.io/badge/node-12.x-green)

Typescript wrapper for [supranational/blst](https://github.com/supranational/blst) native bindings, a highly performant BLS12-381 signature library.

## Usage

```bash
yarn add @chainsafe/blst
```

This library comes with pre-compiled bindings for most platforms. You can check current support in [releases](https://github.com/ChainSafe/blst-ts/releases). If your platform is not supported, bindings will be compiled from source as a best effort with node-gyp.

```ts
import {SecretKey, verify} from "@chainsafe/blst";

const msg = Buffer.from("sample-msg");
const sk = SecretKey.fromKeygen(Buffer.alloc(32, 1));
const pk = sk.toPublicKey();
const sig = sk.sign(msg);

console.log(verify(msg, pk, sig)); // true
```

This library exposes two types of classes for public keys and signatures: `PublicKey` & `AggregatePublicKey`, `Signature` & `AggregateSignature`

- `PublicKey`: Contains an affine point (x,y). It's the default representation of the point and what you need to serialize to and deserialize from.
- `AggregatePublicKey`: Contains a jacobian point (x,y,z). It's optimal to perform aggregation operations.

## Spec versioning

This library has a hardcoded configuration compatible with Eth2.0 spec:

| Setting        | value                                         |
| -------------- | --------------------------------------------- |
| PK_IN          | `G1`                                          |
| HASH_OR_ENCODE | `true`                                        |
| DST            | `BLS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_POP_` |
| RAND_BITS      | `64`                                          |

> [spec](https://github.com/ethereum/eth2.0-specs/blob/v0.11.1/specs/phase0/beacon-chain.md#bls-signatures)

> [test vectors](https://github.com/ethereum/eth2.0-spec-tests/tree/master/tests/bls)

## Developing

Note that this repo contains a git submodule. Make sure the git submodule `blst` is populated before attempting to build locally. After cloning run:

```
git submodule update --init --recursive
```

## Using emscripten bindings

```bash
yarn add @fetchai/blst-ts
# or
npm install --save @fetchai/blst-ts
```

#### `package.json`:
```javascript
depencencies: {
  "@ChainSafe/blst": "^0.3.0",
  ...
}
```

#### `webpack.config.js` (V5):
```javascript
module.exports = {
  resolve: {
    fallback: {
      "crypto": require.resolve("crypto-browserify"),
      "stream": require.resolve("stream-browserify"),
      "buffer": require.resolve("buffer"),
      "assert": require.resolve("assert-browserify"),
      "path": require.resolve("path-browserify"),
      "fs": false,
    },
    ...
  },
  ignoreWarnings: [
    {
      module: /^(fs|process)$/,
    }
  ]
}
```

#### `webpack.config.js` (V4):
```javascript
module.exports = {
  plugins: [
    new webpack.IgnorePlugin(/^(fs|process)$/),
  ],
  ...
}
```

### Building WebAssembly module

_(NOTE: docker is required to use the script)_

```bash
yarn build:emscripten
```

##### Manual build
_(NOTE: a copy of [emsdk](https://github.com/emscripten-core/emsdk) is required to build for web assembly. See [emscripten docs -> Building Projects](https://emscripten.org/docs/compiling/Building-Projects.html) for more information)_

```bash
# ensure enscripten sdk is active
/path/to/emsdk/emsdk activate
source /path/to/emsdk/emsdk_env.sh

CROSS_COMPILE=em CFLAGS="-o ./prebuild/emscripten/blst.js --pre-js ./prebuild/emscripten/pre.js --post-js ./prebuild/emscripten/post.js ./prebuild/emscripten/blst_glue_wrapper.cpp" ./blst/build.sh -link -no-archive
```

## Testing in the browser

Once built (see [building WebAssembly module](#building-webassembly-module)), applicable mocha tests can be run in the browser using webpack:

```bash
yarn test:browser
```

#### Karma

Additionally, [Karma](https://karma-runner.github.io/6.3/index.html) is configured to run browser-relevant tests in chrome by starting and running:

```bash
# Optionally, CHROME_BIN=$(which <non-standard-chromium-flavor>)
# (see: https://github.com/karma-runner/karma-chrome-launcher)

yarn karma start
```

```bash
# separate shell

yarn karma run
```

_(NOTE: it currently seems like Karma has to be run a few times before it picks up all the tests)_

## License

Apache-2.0
