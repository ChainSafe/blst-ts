# Intro

1. [Introduction](./intro.md)
    - [Overview](./intro.md#overview)
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

## Overview

## Motivation and Goals

## What JS Developers Take For Granted


## Dumping Ground

At the moment this is sort of a dumping ground for stuff that was written but didn't really fit in the section it was written.  I'll probably come back and finish the intro last...

During the development of this library, a few paths were gone done to arrive at the "best fit" solution.  Some of the critical decisions are highlighted below, provided with a bit of background for each.

Seeing as we are building bindings, this guide would be incomplete without a discussion on binding data from `C` for JS usage and vice versa.  There is a lot of good resource about this out there so no need to reinvent the wheel.  Follow the doc links below for more info on each.

In `C++` the best way keep track of allocations like that is RAII through implementation of a class that can cleanup everything.  In `C` the implementation just takes those member functions off the class and one creates a `struct` with associated free functions.  To CRUD the struct, the struct is generally passed as the first argument to the associated functions. For large `C` code bases it is debated whether an implied receiver is "better" than passing as an argument.

The ultimate decision came down to the `node-addon-api` being easier to work with.  The class structure makes a lot of well informed choices that are difficult to implement independently.  Async is very tricky because there are a lot of phases that need to be handled explicitly and the classes implement lines of code that would need to be hand written to make the `C` api "work".

What does this mean...
["// Allow placement new."](https://github.com/nodejs/node/blob/4166d40d0873b6d8a0c7291872c8d20dc680b1d7/deps/v8/src/handles/handles.h#L211)
