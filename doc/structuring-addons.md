# Structuring Addons

## Phases of Execution

There were a couple of design decisions that evolved over a couple of iterations of this library.  The part about re-parallelization is covered in [Mixed Multi-Threading](./multi-threading.md#mixed-multi-threading).  Another was providing both a sync and async implementation for analysis and post-MVP decision making.

While building the POC version a lot of code was non-DRY.  When I first started, some of the paradigms that are written about in this documentation had not yet evolved. One of the big things I sought to do for the second iteration was to DRY up places that could be consolidated, in particular: argument parsing, validation and function setup.

I originally wrote the sync and async versions of the functions separately.  That highlighted a pattern. Bindings code goes through specific phases of execution and they are very clearly delineated.  As a note these will be the "phases" that are referred to in the rest of this document.

1. Argument parsing, validation and conversion to native format
2. Execution of native library code
3. Return value conversion to JS format

On top of that, the code for the first and third phases were identical regardless of the second phase running on the main thread or if the work was submitted as `node::ThreadPoolWork`.  This revelation removed a huge amount of code and centralized some critical sections that are prone to hard-to-debug errors.  It also helped to solidify the "Worker Pattern" that is utilized throughout the library.

```c++
class BlstAsyncWorker : public Napi::AsyncWorker {
public:
    // all that is necessary to create the Worker is the incoming function context
    BlstAsyncWorker(const Napi::CallbackInfo &info);

    // execute work on main thread or on libuv worker thread. these are
    // both Phase 2
    Napi::Value RunSync();
    Napi::Value Run();

protected:
    // saved to preserve context
    const Napi::CallbackInfo &_info;
    Napi::Env _env;

    // pure virtual functions that must be implemented by the function worker
    //
    // Setup is responsible for Phase 1
    virtual void Setup() = 0;
    // GetReturnValue is responsible for Phase 3
    virtual Napi::Value GetReturnValue() = 0;

private:
    Napi::Promise::Deferred _deferred;
};
```

Each function has a Worker that extends `BlstAsyncWorker`. In this context it helps to simplify the setup/return conversions and simplifies the library structure. The Worker Pattern started because of the way a JS `Promise` is constructed.  There is the JS side we are familiar with, and the native side is `Napi::Promise::Deferred`.  `Napi::Promise::GetDeferred` is a method that returns a native handle to the `Promise`, that gets returned to JS. The handle is stored as `_deferred`, and needs to be maintained by the Worker to resolve/reject the `Promise`. RAII manages it as a member of the extended `Napi::AsyncWorker`.  It was done that way for clean-up, since the `AsyncWorker` is designed to self-destruct after returning its value.

## Complex Data Types

JS is much more forgiving than `C` when it comes to data types. In particular, converting TypeScript Union types to native data can be quite verbose.  There needs to be explicit type checking and conversion for each step of the unwrapping process. It is much easier to do this with a helper class. It is possible to not use helper classes, however there is a lot of boilerplate code that needs to be written and maintained. The helper classes are designed to be used during class construction and the results can be checked during the `Setup` phase of the Worker.  This not only simplifies the code but also makes error handling much easier.

## Context-Awareness

"Context Awareness" is a term that popped up during a segfault googling session.  While the fix was unrelated it highlighted an important idea. Node loads dll's once and `.js` files for each `Isolate`.

In the case of native addons, the `.node` file may be `require`d by different threads and each has its own `Isolate` (think `Electron` and `Workers`). The problem is they share memory space. Even though the .dll is only loaded once it is initialized by each `Isolate`.  If the initialization overwrites any information required by another `Environment` there will be a segfault or undefined behavior.

To ensure that addons can function under any circumstance it is best to follow a few rules:

- Do not use static or globally-scoped variables
- Do not use static class members (these are stored similarly)
- Current best practice is to use `napi_set_instance_data` and `napi_get_instance_data` to manage `Environment` specific data

More info can be found [here](https://nodejs.github.io/node-addon-examples/special-topics/context-awareness/)

While it is not necessary to set "globals" as "instance data", one should at a minimum make sure to use a [cleanup function](https://nodejs.org/dist/latest-v18.x/docs/api/n-api.html#cleanup-on-exit-of-the-current-nodejs-instance) instead of trying to manually manage the memory.
