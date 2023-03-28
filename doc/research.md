# Research

During the development of this library, a few paths were gone done to arrive at the "best fit" solution.  Some of the critical decisions are highlighted below, provided with a bit of background for each.

## Multi-Threading

It is possible to achieve multi-threading in a couple of ways with native `node` modules.  The first option is to use `node` threads and let `libuv` do the scheduling of work.  The second is to use native `c`-level `std::thread`(s).  A third method is to use the two together in tandem.

This library was first implemented using the third method and then rewritten to use the first.  We will discuss them all in turn though.

### `node.js` Multi-Threading

The most predictable way to handle multi-threading is to use the build-in thread pool that ships with `node`.  It is the magic behind "single-threaded execution" that makes `node` so easy to reason about.  This method was ultimately implemented.

Work is submitted to the thread-pool and queued for execution in the order it was received.  There are a number of constructs available through `n-api` and the discussion of several can be found in the [`n-api`](./napi.md) overview.

The functions that are used by `blst-ts` are the `napi_*_async_work` functions.  They are implemented using the `Napi::AsyncWorker` class.  The constructor and destructor call `napi_create_async_work` and `napi_delete_async_work` respectively.  `Napi::AsyncWorker::Queue` is responsible for calling `napi_queue_async_work`.  You can see the implementation of [napi_create_async_work](https://github.com/nodejs/node/blob/4166d40d0873b6d8a0c7291872c8d20dc680b1d7/src/node_api.cc#L1138) to get an idea of how `node-addon-api` relates to `n-api`  and how that integrates with underlying `v8` and `libuv` libraries.

### `std::thread` Multi-Threading

### Mixed Multi-Threading



## Using `n-api` vs `node-addon-api`

## Auto-Generated `c++` functions

