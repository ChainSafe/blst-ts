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
import { SecretKey, verify } from "@chainsafe/blst";

const msg = Buffer.from("sample-msg");
const sk = SecretKey.fromKeygen(Buffer.alloc(32, 1));
const pk = sk.toPublicKey();
const sig = sk.sign(msg);

console.log(verify(msg, pk, sig)); // true
```

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

## License

Apache-2.0
