# `supranational/blst`

## Overview

`blst` (pronounced 'blast') is a BLS12-381 signature library focused on performance and security. It is written in C and assembly.

The library deliberately abstains from dealing with memory management and multi-threading, with the rationale that these ultimately belong in language-specific bindings. Another responsibility that is left to application is random number generation. All this in the name of run-time neutrality, which makes integration into more stringent environments like Intel SGX or ARM TrustZone trivial.

The `chainsafe/blst-ts` library was specifically built to focus on the multi-threading part.  Random numbers are generated via `openssl`, however, you may have noted that it is not a dependency of this library. `node.js` builds `openssl` from source, and uses `RAND_bytes` so that symbol will be available at runtime.

**_note_**: There is no road map for `node.js` to move away from `openssl` but if it does this library will need to build `RAND_bytes` or replace it with another random number generator.

## Structure

The most important code in `supranational/blst`, referred to as just `blst` for the rest of this readme, is in the `bindings` folder.  While `src` is where the implementation happens, `bindings` is where you will find the exported interfaces.  There are two you will want to focus on are `blst.h` and `blst.hpp`.  They are the `c` and `c++` api you will be working with.

## Existing `node` Bindings

The existing `node.js` bindings are [`Swig`](https://www.swig.org/index.html) generated.  All of the functions run synchronously on the main JS thread which is not ideal for server situations.  Despite this, the `blst` library has other functionality that is quite useful.  The scope of `blst-ts` focuses on public key infrastructure so we are only using a small fraction of what the full `blst` library is capable of.

## Adding the Library as a Dependency

## Initialization of `blst::Pairing`

When implementing the `supranational/blst` library, it is important to note that the `blst::Paring` is a 0 byte opaque struct.  In `c` use `blst::blst_pairing_sizeof()` to `malloc` the correct amount of space.  For `c++`, the library overrides the [new operator](https://github.com/supranational/blst/blob/a7fd1f584d26b0ae6cdc427976ea1d8980f7e15d/bindings/blst.hpp#L889), so you can invoke that, or use a smart pointer as one would normally.
