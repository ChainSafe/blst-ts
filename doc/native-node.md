# Native Node Modules

Running "native" code via node.js is nothing new.  What has changed over the years is how native modules are built.  Originally they were build by calling the underlying libraries like `v8` and `libuv` directly.  All people would do was bring in a header file and off they went, roughly...

There were lots of internal API changes that were breaking and addon code needed to be updated for each library change so gyp would build.  I remember fondly watching c compile v8 warnings on `npm install` in the early days.  NAN was created as an open source alternative to ease the maintenance burden and it was popular enough that the node team built in something similar.

Que `Node-API`

## `Node-API`

Node is a `C++` application so one would think that exporting a `C++` api would be the thing to do.  But for portability the team create a `C` API and this design decision has opened up node to every language that is compatible with a `C` abi.  That is most btw.  It is technically possible to write node addons in C, C++, Rust, Go, Java, C#, etc...

`Node-API` is built and compiled in with node so those tokens are available at runtime to any dynamically linked library.  All that is necessary to use it is the header file `node_api.h` which can be found [here](https://github.com/nodejs/node/blob/main/src/node_api.h).

## `node-addon-api`

`node-addon-api` is a header-only `C++` library that is published and installed via [npm](https://www.npmjs.com/package/node-addon-api).  It is broken into two files [napi.h](https://github.com/nodejs/node-addon-api/blob/main/napi.h), which has all of the class definitions, and [napi-inl.h](https://github.com/nodejs/node-addon-api/blob/main/napi-inl.h) that contains the function implementations.

We are going to look at async work as an example and analyze how the two pieces fit together and how the `C` code patterns and `C++` patterns interact.

```c++
class AsyncWorker
{
public:
    void Queue() {
        napi_status status = napi_queue_async_work(_env, _work);
        NAPI_THROW_IF_FAILED_VOID(_env, status);
    }
}
/**
 *
 * Below here is `nodejs/node`
 *
 */
napi_status NAPI_CDECL napi_queue_async_work(
    napi_env env,
    napi_async_work work
) {
    CHECK_ENV(env);
    CHECK_ARG(env, work);

    uv_loop_t *event_loop = nullptr;
    STATUS_CALL(napi_get_uv_event_loop(env, &event_loop));

    uvimpl::Work *w = reinterpret_cast<uvimpl::Work *>(work);

    w->ScheduleWork();

    return napi_clear_last_error(env);
}
```

That code excerpt is a mix of the two files mentioned [above](#node-api) and shows the declaration and implementations together.  Below the class is the `C` implementation of `napi_queue_async_work` that is found in the `nodejs/node`.

The [full async implementation](./reference.md#full-async-implementations) is available in the reference section.

## Similarities and Differences

The `C` and `C++` apis' are nearly identical.  The 2 exceptions are:

- New features arrive in `C` first.  It generally takes a few months for the `C++` api to catch up
- Not all features get implemented in `node-addon-api` but its a small list

See the [`C/C++` big decision](./intro.md#c-vs-c) for more details.

## `napi-rs`

While its possible to write native addons in most languages, the only two that are officially supported are `C` and `C++`. `Rust` however, is not forgotten.  `napi-rs` is a `Rust` library that uses `Node-AP`, as `extern C`, and wraps it in a `Rust`-friendly API.

You can find the docs [here](https://napi.rs/).

I considered using the `Rust` bindings in `blst` and wrapping them in `napi-rs` as it already has the functions we need and we could wrap the bindings to massage the API into correct form. Unfortunately, the bindings are multithreaded and will [mix multi-threading methodologies](./multi-threading.md#mixed-multi-threading)
