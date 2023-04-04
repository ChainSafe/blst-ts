# Structuring Addons

## Phases of Execution

There were a couple of design decisions that evolved over a couple of iterations of this library.  The part about re-parallelization was covered in [Mixed Multi-Threading](./multi-threading.md#mixed-multi-threading).  Another was providing both a sync and async implementation for analysis and post-MVP decision making.

While building the POC version of this library a lot of code was non-DRY.  When I first started coding some of the paradigms that are written about in this documentation had not yet evolved and one of the big things I sought to do for the second iteration was to DRY up places that could be consolidated.  In particular argument parsing/validation and function setup.

I originally wrote the sync and async versions of the functions separately.  That highlighted a pattern. Bindings code goes through specific phases of execution and they are very clearly delineated.  As a note these will be the "phases" that are referred to in the rest of this document.

1. Argument parsing, validation and conversion to native format
2. Execution of native library code
3. Return value conversion to JS format

On top of that, the code for the first and third phases were identical regardless of the second phase running on the main thread or if the work was submitted as `node::ThreadPoolWork`.  This revelation removed a huge amount of code and centralized some critical sections that are prone to hard to debug errors.  It also helped to solidify the "Worker Pattern" that is utilized throughout the library.

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
};
```

Each function has a Worker that extends `BlstAsyncWorker`. In this context it helps to simplify the setup/return conversions and simplifies the library structure. The Worker Pattern started because of the way a JS Promise is constructed.  There is the JS side we are familiar with, and the native side is `Napi::Promise::Deferred`.  A handle to `_deferred` needs to be maintained to resolve/reject the `Promise` so it is stored as a member of the extended `Napi::AsyncWorker`.  It was done that way for clean-up as the `AsyncWorker` is designed to self-destruct after returning its value.

## Complex Data Types

## Context-Awareness

"Context Awareness" is a term that popped up during a segfault googling session.  While the fix was unrelated it highlighted an important idea. Node loads dll's once and `.js` files for each `Isolate`.

In the case of native addons, the `.node` file may be `require`d by different threads and each has its own `Isolate` (think `Electron` and `Workers`). The problem is they share memory space. Even though the .dll is only loaded once it is initialized by each `Isolate`.  If the initialization over-writes any information required by another `Environment` there will be a segfault or undefined behavior.

To ensure that addons can function under any circumstance it is best to follow a few rules:

- Do not use static or globally scoped variables
- Do not use static class members (there are stored similarly)
- Use `napi_set_instance_data` and `napi_get_instance_data` to manage data that is specific to an `Environment`
