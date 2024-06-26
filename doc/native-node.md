# Native Node Modules

Running "native" code via node.js is nothing new.  What has changed over the years is how native modules are built.  Originally, they were built by calling the underlying libraries like `v8` and `libuv` directly.  All people would do was bring in a header file and off they went, roughly...

There were lots of internal API changes that were breaking and addon code needed to be updated for each library change so gyp would build.  I remember fondly watching c compile v8 warnings on `npm install` in the early days.  NAN was created as an open source alternative to ease the maintenance burden, and it was popular enough that the node team built in something similar.

Que `Node-API`

tl/dr? Skip to the end of [`napi-rs`](#napi-rs) for a surprise.

## `Node-API`

Node is a `C++` application so one would think that exporting a `C++` api would be the thing to do.  But for portability the team create `Node-API` as a `C` API, and this design decision has opened up node to every language that is compatible with the `C` [FFI](https://en.wikipedia.org/wiki/Foreign_function_interface#Operation_of_an_FFI) standard.  That is most btw.  It is technically possible to write node addons in C, C++, Rust, Go, Java, C#, etc...

`Node-API` is built and compiled in with node so those tokens are available at runtime to any dynamically linked library.  All that is necessary to use it is the header file `node_api.h` which can be found [here](https://github.com/nodejs/node/blob/main/src/node_api.h).

## `node-addon-api`

`node-addon-api` is a header-only `C++` library that is published and installed via [npm](https://www.npmjs.com/package/node-addon-api).  It is broken into two files [napi.h](https://github.com/nodejs/node-addon-api/blob/main/napi.h), which has all of the class definitions, and [napi-inl.h](https://github.com/nodejs/node-addon-api/blob/main/napi-inl.h) that contains the function implementations.

We are going to look at async work as an example and analyze how the two pieces fit together and how the `C` code patterns and `C++` patterns interact.

```c++
/**
 *
 * `node-addon-api`
 *
 */
class AsyncWorker
{
public:
    void Queue() {
        napi_status status = napi_queue_async_work(_env, _work);
        NAPI_THROW_IF_FAILED_VOID(_env, status);
    }
private:
    napi_env _env;
    napi_async_work _work;
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

See the [`C/C++` big decision](./readme.md#c-vs-c) for more differences.

## `napi-rs`

While its possible to write native addons in most languages, the only two that are officially supported are `C` and `C++`. `Rust` however, is not forgotten.  `napi-rs` is a `Rust` library that uses `Node-API`, as `extern C`, and wraps it in a `Rust`-friendly API.

You can find the docs [here](https://napi.rs/).

### The `napi-rs` Kicker

I considered using the [blst `Rust` bindings](https://github.com/supranational/blst/tree/master/bindings/rust) and wrapping them in `napi-rs` as it mostly has the functions we need. We could wrap the bindings in a thin wrapper to massage it into our PKI API.

Unfortunately, the bindings are already multi-threaded and will suffer the same issues as the [mixed multi-threading approach](./multi-threading.md#mixed-multi-threading). It would also be a new language to learn. It also feels a bit silly going from `C` to `Rust` to `C` to `C++`.  I am also not sure if there will be a performance hit for the extra layer of abstraction. Lots of "also's" there.  I considered doing a performance analysis to see what turns up, but my guess is that there will be negligible.

Given the feature sets and learning curves of `C++` vs `Rust`, and the memory paradigm of `Rust`, I would consider building bindings in `Rust` if we were building a new application from scratch.  But for this project, I think `C++` is the right choice.
