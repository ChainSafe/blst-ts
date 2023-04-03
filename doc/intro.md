# Intro

This document is an attempt to provide a more approachable introduction to `@chainsafe/blst-ts` for JavaScript developers.  The docs for `Node-API` and the other dependencies are terse, long and geared towards `C/C++` developers. On top of that, this library is critical to runtime efficiency for [Lodestar](https://github.com/ChainSafe/lodestar) and more than one viewpoint will benefit both projects and the community.

My goal is to share some resources that were helpful, decisions that were made, to give an overview of native addons, nuances of working with the dependencies, and most importantly how that all fits together at runtime.

## Table of Contents

1. [Introduction](./intro.md)
    - [Table of Contents](./intro.md#table-of-contents)
    - [The Big Decisions](./intro.md#the-big-decision)
    - [Motivations & Goals](./intro.md#motivation-and-goals)
    - [What JS Developers Take For Granted](./intro.md#what-js-developers-take-for-granted)
2. [`blst-ts`](./repo.md)
    - [Repository Structure](./repo.md#organization)
    - [Scripts](./repo.md#scripts)
    - [Dependencies](./repo.md#dependencies)
    - [Style Guide](./repo.md#style-guide)
3. [`supranational/blst`](./blst.md)
    - [Library Overview](./blst.md#overview)
    - [Repo Structure](./blst.md#structure)
    - [Existing `node.js` Bindings](./blst.md#existing-node-bindings)
    - [Adding the Library as a Dependency](./blst.md#adding-the-library-as-a-dependency)
    - [Initialization of `blst::Pairing`](./blst.md#initialization-of-blstpairing)
4. [`C++` Addons](./napi.md)
    - [`Node-API`](./napi.md#node-api)
    - [`node-addon-api`](./napi.md#node-addon-api)
    - [Similarities and Differences](./napi.md#similarites-and-differences)
    - [Which to Use](./napi.md#which-to-use)
5. [The Environment](./environment.md)
    - [Definitions](./environment.md#definitions)
    - [Bringing It All Together](./environment.md#bringing-it-all-together)
6. [JavaScript Values Under-the-Hood](./values.md)
    - [Allocation and De-Allocation](./values.md#allocation-and-de-allocation)
    - [`v8::Value` and `Napi::Value`](./values.md#v8value-and-napivalue)
    - [`v8::HandleScope` and `Napi::HandleScope`](./values.md#v8handlescope-and-napihandlescope)
    - [Lexical Context](./values.md#lexical-context)
    - [The Reference System](./values.md#the-reference-system)
7. [Multi-Threading](./multi-threading.md)
    - [`std::thread` Multi-Threading](./multi-threading.md#stdthread-multi-threading)
    - ["Mixed" Multi-Threading](./multi-threading.md#mixed-multi-threading)
    - [`libuv` Multi-Threading](./multi-threading.md#libuv-multi-threading)
    - [`blst-ts` Multi-Threading Implementation](./multi-threading.md#blst-ts-multi-threading-implementation)
    - [Returning Promises from Native Code](./multi-threading.md#returning-promises-from-native-code)
8. [Structuring Addons](./structuring-addons.md)
    - [Parsing Arguments](./structuring-addons.md#parsing-arguments)
    - [Complex Data Types](./structuring-addons.md#complex-data-types)
    - [Context-Awareness](./structuring-addons.md#context-awareness)
9. [Debugging](./debugging.md)
    - [Setting-Up the Debugger in VSCode](./debugging.md#setting-up-the-debugger-in-vscode)
    - [Setting-Up `Valgrind`](./debugging.md#setting-up-valgrind)
    - [Compiler-Generated Functions in C++](./debugging.md#compiler-generated-functions-in-c)
10. [Building Addons](./building.md)
    - [Building `C/C++` Code](./building.md#building-c-c-code)
    - [Build Tools](./building.md#build-tools)
    - [`node-gyp`](./building.md#node-gyp)
    - [`binding.gyp`](./building.md#bindinggyp)
11. [A JS Developer's Perspective on `C/C++`](js-perspective-on-c.md)
    - [Memory Management](./js-perspective-on-c.md#memory-management)
    - [Compiler-Generated Functions](./js-perspective-on-c.md#compiler-generated-functions)
    - [Passing To and Returning From Functions](./js-perspective-on-c.md#passing-to-and-returning-from-functions)
    - [Closing Thoughts](./js-perspective-on-c.md#closing-thoughts)

## The Big Decisions

### `C` vs `C++`

Most of the docs and blogs are written for `C++` and while I was researching things I found it rare to see examples using the raw `Node-API`. After working with both it has become very clear to me why that is. In `C++` the best way keep track of allocations is RAII, through implementation of OOP, where classes cleanup themselves.

In `C` the implementation of bindings code takes the member functions off of the classes. One creates a `struct` with a set of associated free functions. The functions CRUD the `struct` appropriately and it is generally passed as the first argument to the associated functions.

The ultimate decision came down to using `node-addon-api` is easier.  The class structure makes a lot of well informed choices that are difficult to implement independently.  A big thing is async is very tricky in `C`. There are a lot of phases that need to be handled explicitly and the classes [implement](./reference.md#node-addon-api) lines of code that would need to be written by hand just to make the `C` api "work".

While writing the bindings for EIP-4844 I was [requested](https://github.com/ethereum/c-kzg-4844/pull/177#discussion_r1127851634) to use the `C` API for a section of code so it is definitely possible. That was synchronous boilerplate code that had an easy-to-follow [example](https://nodejs.github.io/node-addon-examples/special-topics/context-awareness/#bindingc). For complex situations like TS union types and multi-stage execution, `C` can be very difficult to implement.


## Dumping Ground

At the moment this is sort of a dumping ground for stuff that was written but didn't really fit in the section it was written.  I'll probably come back and finish the intro last...

There are a lot of good resource on the web and there is a curated list of resources so there is no need to reinvent the wheel.

Seeing as we are building bindings, this guide would be incomplete without a discussion on binding data from `C` for JS usage and vice versa.

What does this mean...
["// Allow placement new."](https://github.com/nodejs/node/blob/4166d40d0873b6d8a0c7291872c8d20dc680b1d7/deps/v8/src/handles/handles.h#L211)
