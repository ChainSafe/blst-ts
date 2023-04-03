# Node.js C/C++ Addons

Running "native" code via node.js is nothing new.  What has changed over the years is how native modules are built.  Originally they were build by calling the underlying libraries like `v8` and `libuv` directly.  All people would do was bring in a header file and off they went, roughly...

There were lots of internal API changes that were breaking and addon code needed to be updated for each library change so gyp would build.  I remember fondly watching c compile v8 warnings on `npm install` in the early days.  NAN was created as an open source alternative to ease the maintenance burden and it was popular enough that the node team built in something similar.

Que `Node-API`

Node is a `C++` application so one would think that exporting a `C++` api would be the thing to do.  But for portability the team create a `C` API and this design decision has opened up node to every language that is compatible with a `C` abi.  That is most btw.  It is technically possible to write node addons in C, C++, Rust, Go, Java, C#, etc...

## `Node-API`


## `node-addon-api`

While its possible to write native addons in most languages, the two that are officially supported are `C` and `C++`, hence `Node-API` and `node-addon-api`. &nbsp;&nbsp;`Node-API` is built and compiled in with node so those tokens are available at runtime to any dynamically linked library.  All that is necessary to use it is the header file `node_api.h` which can be found [here](https://github.com/nodejs/node/blob/main/src/node_api.h). `node-addon-api` is a header-only `C++` library that is published and installed via [npm](https://www.npmjs.com/package/node-addon-api).  It is broken into two files [napi.h](https://github.com/nodejs/node-addon-api/blob/main/napi.h), which has all of the class definitions, and [napi-inl.h](https://github.com/nodejs/node-addon-api/blob/main/napi-inl.h) that contains the function implementations.

We are going to look at async work as an example and analyze how the two pieces fit together, how "`c`" code patterns and "`C++`" patterns interact, how best-practice `C++` code is structured and how the napi code actually interacts with `v8` and `libuv`.

## Similarities and Differences

