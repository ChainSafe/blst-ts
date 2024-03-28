# Multi-Threading

It is possible to achieve multi-threading in a couple of ways with native `node` modules.  The first option is to use `node` threads and let `libuv` do the scheduling of work.  The second is to use native `c`-level `std::thread`(s).  A third method is to use the two together in tandem.

This library was first implemented using the third method and then rewritten to use the first.  We will discuss them all in turn though.

## `std::thread` Multi-Threading

Start from a basis that using native threads by themselves is not a great solution.  It implies spawning native c threads while on the JS thread.  Not only will the function call be blocking, but the native threads will compete with the `libuv` threads and there will be thread-level context switching.  No bueno...

## Mixed Multi-Threading

In the first pass of building the `@chainsafe/blst-ts` library this is the approach that was attempted.  Use the method below to create an AsyncWorker and while on the worker thread spawn a native `C` thread pool and re-parallelize the library calls.  It was shockingly fast.  I have 10 cores so if a call with the SWIG bindings took 10 second, a call to the new bindings would take 1.  Drop the mic.

This is not as good as it seems though.  While it looks great on paper, under real server load the library thread pool would compete for time with the node thread pool and there would be an unnecessary amount of context switching.  It is probably better to treat the batch process as a unit of work and run it on a separate thread.  Aggregated across the whole server load, the work will be managed much better. The heart of what JS does well is managing thread work, just let the engine do what it does best.

## `libuv` Multi-Threading

The most predictable way to handle multi-threading is to use the built-in thread pool that ships with `node`.  It is the magic behind "single-threaded execution" that makes `node` so easy to reason about.  This method was ultimately implemented.

Work is submitted to the thread-pool and queued for execution in the order it was received.  There are a number of constructs available through `n-api` and the discussion of several can be found in the [`n-api`](./native-node.md) overview.

The functions that are used by `blst-ts` are the `napi_*_async_work` functions.  They are implemented using the `Napi::AsyncWorker` class.  The constructor and destructor call `napi_create_async_work` and `napi_delete_async_work` respectively.  `Napi::AsyncWorker::Queue` is responsible for calling `napi_queue_async_work`.  You can see the implementation of [napi_create_async_work](https://github.com/nodejs/node/blob/4166d40d0873b6d8a0c7291872c8d20dc680b1d7/src/node_api.cc#L1138) to get an idea of how `node-addon-api` relates to `n-api`  and how that integrates with underlying `v8` and `libuv` libraries.

## Returning Promises from Native Code

There are some distinct challenges to structuring asynchronous code.  The invocation will begin with context provided by the incoming `Napi::CallbackInfo` and that context will cease once the calling function returns.  The actual work will happen at some point in the future, as will returning a value to the calling context.

The `Napi::Promise::Deferred` will help us bridge the gap between the calling context and returning context. Holding handles to and from Phase 2, where the work happens, is up to the implementer.  The section about [values](./values.md) will provide background on the topic.  tl/dr; one needs to create some `References` and then some handles to the native-compatible underlying data.

Most of the parsing MUST happen on thread as there are calls in the underlying code to `napi_env`.  This is the critical no-no of native JS code.  There can be zero interaction with the JS runtime unless the function is actively running on-thread.  As an example a `Napi::String` will be what is delivered to native code but in order to get access to the `std::string` or `char *` one will need to get that on thread.  Just having a `napi_value` handle does not necessarily mean you have access to the actual data. That needs to be done before returning from the original calling context (function coming in from JS).

The same applies for return values that go back from worker-thread context to JS.  As an example the value that returns from `*Verify` functions.  The actual `bool` derived from the native function would be stored on the Worker and then in the `GetReturnValue` it would be converted via `Napi::Boolean::New`.  All functions that run on-thread will take `napi_env` as the first argument and creating `New` values is no exception.

This is a stripped-down version of the `BlstAsyncWorker` to show what members it holds. `_deferred` is the handle spoken about above.  It holds the methods `_deferred.Resolve` and `_deferred.Reject` that are used to return values to JS.

```c++
class BlstAsyncWorker : public Napi::AsyncWorker
{
protected:
    const Napi::CallbackInfo &_info;
    Napi::Env _env;
    BlstTsAddon *_module;

private:
    Napi::Promise::Deferred _deferred;
    bool _use_deferred;
    std::string _error;
};
```

By placing the handles on a class they are available to the methods throughout the phases of execution.  The class is structured so that one function runs on thread to parse the incoming `CallbackInfo` a second runs the "work" and third converts the return value from a native member of the Worker into a JS value that gets sent to the original context.
