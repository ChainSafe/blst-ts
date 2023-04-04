# Intro

This document is an attempt to provide a more approachable introduction to `@chainsafe/blst-ts` for JavaScript developers.  The docs for `Node-API` and the other dependencies are terse, long and geared towards `C/C++` developers. On top of that, this library is critical to runtime efficiency for [Lodestar](https://github.com/ChainSafe/lodestar) so more than one viewpoint will benefit both projects and the community.

My goal is to share some resources that were helpful, decisions that were made, to give an overview of native addons, nuances of working with the dependencies, and most importantly how that all fits together at runtime.

With hopes this guide will help inform the team for a thorough review process and onboard new contributors for maintenance. I also want to lower the barrier for using native code at ChainSafe so if there is a potential opportunity through native modules, it will be an easier decision-making and development process.

## Table of Contents

1. [Introduction](./intro.md)
    - [Table of Contents](#table-of-contents)
    - [The Big Decisions](#the-big-decisions)
        - [`C` vs `C++`](#c-vs-c)
        - [Callbacks vs. Promises](#callbacks-vs-promises)
        - [Error Handling](#error-handling)
2. [`@chainsafe/blst-ts`](./repo.md)
    - [Organization](./repo.md#organization)
    - [Scripts](./repo.md#scripts)
    - [Dependencies](./repo.md#dependencies)
    - [Style Guide](./repo.md#style-guide)
3. [`supranational/blst`](./blst.md)
    - [Library Overview](./blst.md#overview)
    - [Repo Structure](./blst.md#structure)
    - [Existing `node.js` Bindings](./blst.md#existing-node-bindings)
    - [Initialization of `blst::Pairing`](./blst.md#initialization-of-blstpairing)
4. [Native Node Modules](./native-node.md)
    - [`Node-API`](./native-node.md#node-api)
    - [`node-addon-api`](./native-node.md#node-addon-api)
    - [Similarities and Differences](./native-node.md#similarites-and-differences)
    - [`napi-rs`](./native-node.md#napi-rs)
5. [Structuring Addons](./structuring-addons.md)
    - [Phases of Execution](./structuring-addons.md#phases-of-execution)
    - [Complex Data Types](./structuring-addons.md#complex-data-types)  **_(still working)_**
    - [Context-Awareness](./structuring-addons.md#context-awareness)
6. [Building Addons](./building.md)
    - [Build Tools](./building.md#build-tools)
    - [`node-gyp`](./building.md#node-gyp)
    - [`binding.gyp`](./building.md#bindinggyp)
    - [Adding a Library as a Dependency](./building.md#adding-a-library-as-a-dependency)
7. [Debugging Addons](./debugging.md) **_(still working)_**
    - [Setting-Up the Debugger in VSCode](./debugging.md#setting-up-the-debugger-in-vscode)
    - [Setting-Up `Valgrind`](./debugging.md#setting-up-valgrind)
    - [Compiler-Generated Functions in C++](./debugging.md#compiler-generated-functions-in-c)
8. [The `Environment`](./environment.md)
    - [Definitions](./environment.md#definitions)
    - [Bringing It All Together](./environment.md#bringing-it-all-together)
9. [JavaScript Values Under-the-Hood](./values.md) **_(still working)_**
    - [Allocation and De-Allocation](./values.md#allocation-and-de-allocation)
    - [`v8::Value` and `Napi::Value`](./values.md#v8value-and-napivalue)
    - [`v8::HandleScope` and `Napi::HandleScope`](./values.md#v8handlescope-and-napihandlescope)
    - [Lexical Context](./values.md#lexical-context)
    - [The Reference System](./values.md#the-reference-system)
10. [JS Classes](./classes.md) **_(still working)_**
11. [Multi-Threading](./multi-threading.md)
    - [`std::thread` Multi-Threading](./multi-threading.md#stdthread-multi-threading)
    - ["Mixed" Multi-Threading](./multi-threading.md#mixed-multi-threading)
    - [`libuv` Multi-Threading](./multi-threading.md#libuv-multi-threading)
    - [`blst-ts` Multi-Threading Implementation](./multi-threading.md#blst-ts-multi-threading-implementation)
    - [Returning Promises from Native Code](./multi-threading.md#returning-promises-from-native-code)
12. [Errors](./errors.md)
    - [`C` Errors](./errors.md#c-errors)
    - [`C++` Errors](./errors.md#js-errors)
    - [Turning `C++` Exceptions Off](./errors.md#turning-c-exceptions-off)
13. [A JS Developer's Perspective on `C/C++`](./js-perspective-on-c.md)
    - [What JS Developers Take For Granted](./js-perspective-on-c.md#what-js-developers-take-for-granted)
    - [Memory Management](./js-perspective-on-c.md#memory-management)
    - [Compiler-Generated Functions](./js-perspective-on-c.md#compiler-generated-functions)
    - [Passing To and Returning From Functions](./js-perspective-on-c.md#passing-to-and-returning-from-functions)
    - [Closing Thoughts](./js-perspective-on-c.md#closing-thoughts)

## The Big Decisions

### `C` vs `C++`

Most of the docs and blogs are written for `C++` and while I was researching things I found it rare to see examples using the raw `Node-API`. After working with both it has become very clear to me why that is. In `C++` the best way keep track of allocations is RAII, through implementation of OOP, where classes cleanup themselves.

In `C` the implementation of bindings code takes the member functions off of the classes. One creates a `struct` with a set of associated free functions. The functions CRUD the `struct` appropriately and it is generally passed as the first argument to the associated functions.

The ultimate deciding factor was using `node-addon-api` is easier.  The class structure makes a lot of well informed choices that are difficult to implement independently.  A big thing is doing async is very tricky in `C`. There are a lot of phases that need to be handled explicitly and the classes [implement](./reference.md#node-addon-api) lines of code that would need to be written by hand just to make the `C` api "work".

While writing the bindings for EIP-4844 I was [requested](https://github.com/ethereum/c-kzg-4844/pull/177#discussion_r1127851634) to use the `C` API for a section of code so it is definitely possible. That was synchronous boilerplate code that had an easy-to-follow [example](https://nodejs.github.io/node-addon-examples/special-topics/context-awareness/#bindingc). For complex situations like TS union types and multi-stage execution, `C` can be very difficult to implement.

### Callbacks vs Promises

Callbacks feel antiquated and native-level support for promises exists. This was a pretty easy choice.

### Error Handling

Turning errors off adds a lot of complexity with little benefit.  See [Setup](https://github.com/nodejs/node-addon-api/blob/main/doc/setup.md) and [error handling](https://github.com/nodejs/node-addon-api/blob/main/doc/error_handling.md) in the `node-addon-api` docs for more info.
