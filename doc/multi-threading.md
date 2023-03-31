# Multi-Threading

It is possible to achieve multi-threading in a couple of ways with native `node` modules.  The first option is to use `node` threads and let `libuv` do the scheduling of work.  The second is to use native `c`-level `std::thread`(s).  A third method is to use the two together in tandem.

This library was first implemented using the third method and then rewritten to use the first.  We will discuss them all in turn though.

## `std::thread` Multi-Threading

Start from a basis that using native threads by themselves is not a great solution.  It implies spawning native c threads while on the JS thread.  Not only will the function call be blocking, but the native threads will compete with the `libuv` threads and there will be thread-level context switching.  No bueno...

## Mixed Multi-Threading

In the first pass of building the `@chainsafe/blst-ts` library this is the approach that was attempted.  Use the method below to create an AsyncWorker and while on the worker thread spawn a native `C` thread pool and re-parallelize the library calls.  It was shockingly fast.  I have 10 cores so if a call with the SWIG bindings took 10 second, a call to the new bindings would take 1.  Drop the mic.

This is not as good as it seems though.  While it looks great on paper, under real server load the library thread pool would compete for time with the node thread pool and there would be an unnecessary amount of context switching.  It is probably better to treat the batch process as a unit of work and run it on a separate thread.  Aggregated across the whole server load, the work will be managed much better. The heart of what JS does well is managing thread work, just let the engine do what it does best.

## `libuv` Multi-Threading

The most predictable way to handle multi-threading is to use the build-in thread pool that ships with `node`.  It is the magic behind "single-threaded execution" that makes `node` so easy to reason about.  This method was ultimately implemented.

Work is submitted to the thread-pool and queued for execution in the order it was received.  There are a number of constructs available through `n-api` and the discussion of several can be found in the [`n-api`](./napi.md) overview.

The functions that are used by `blst-ts` are the `napi_*_async_work` functions.  They are implemented using the `Napi::AsyncWorker` class.  The constructor and destructor call `napi_create_async_work` and `napi_delete_async_work` respectively.  `Napi::AsyncWorker::Queue` is responsible for calling `napi_queue_async_work`.  You can see the implementation of [napi_create_async_work](https://github.com/nodejs/node/blob/4166d40d0873b6d8a0c7291872c8d20dc680b1d7/src/node_api.cc#L1138) to get an idea of how `node-addon-api` relates to `n-api`  and how that integrates with underlying `v8` and `libuv` libraries.

## `blst-ts` Multi-Threading Implementation

There were a couple of design decisions that evolved over a couple of iterations of this library.  The part about re-parallelization was covered above in Mixed Multi-Threading.  Another was providing both a sync and async implementation for analysis and post-MVP decision making. A third was that the asynchronous return using `Promise`s instead of callbacks.

While building the POC version of this library a lot of code was non-DRY.  When I first started coding some of the paradigms that are written about in this documentation had not yet evolved and one of the big things I sought to do for the second iteration was to DRY up places that could be consolidated.  In particular argument parsing/validation and function setup.

I originally wrote the sync and async versions of the functions separately.  That highlighted a pattern that bindings code goes through specific phases of execution and they are very clearly delineated.  As a note these will be the "phases" that are referred to in the rest of this document.

1. Argument parsing, validation and conversion to native format
2. Execution of native library code
3. Return value conversion to JS format

On top of that, the code for the first and third phases were identical regardless of the second phase running on the main thread or if the work was submitted as `node::ThreadPoolWork`.  This revelation removed a huge amount of code and centralized some critical sections that are prone to hard to debug errors.  It also helped to solidify the "Worker Pattern" that is utilized throughout the library.

Each function has a Worker that extends `BlstAsyncWorker`.  In this context it helps to simplify the setup and return conversions and simplifies the overall structure of the library.  As a note, in the future, if telemetry tells the team that the sync version of a function is not viable it will be  trivial exercise to have the function work extend `Napi::AsyncWorker` directly and the sync version of the function call can be deleted.

The Worker Pattern started because of the way a JS Promise is constructed.  There are is the JS side and the native side through use of `Napi::Promise::Deferred`.  A handle to the `_deferred` needs to be maintained to resolve/reject the `Promise` so it was stored as a member of the extension of `Napi::AsyncWorker`.  It was done that way for clean-up as the `AsyncWorker` is designed to self-destruct after returning its value.

## Returning Promises from Native Code

There are some distinct challenges to structuring asynchronous code.  The invocation will begin with context provided by the incoming `Napi::CallbackInfo` and that context will cease once the calling function returns.  The actual work will happen at some point in the future, as will returning a value to the calling context.

The `Napi::Promise::Deferred` will help us bridge the cap between the calling context and returning to that context but holding handles for the async part when the work happens is up to the implementer.  The section about [values and references](./values_and_references.md) will provide background on the topic but the tl/dr; is one needs to create some references and then some handles to the native-compatible underlying data.

TODO: the next two paragraphs may want to go in the intro

In `C++` the best way keep track of allocations like that is RAII through implementation of a class that can cleanup everything.  In `C` the implementation just takes those member functions off the class and one creates a `struct` with associated free functions.  To CRUD the struct, the struct is generally passed as the first argument to the associated functions. For large `C` code bases it is debated whether an implied receiver is "better" than passing as an argument.

The ultimate decision came down to the `node-addon-api` being easier to work with.  The class structure makes a lot of well informed choices that are difficult to implement independently.  Async is very tricky because there are a lot of phases that need to be handled explicitly and the classes implement lines of code that would need to be hand written to make the `C` api "work".

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

## Full Async Implementations

```c++
/**
 * 
 * node-addon-api
 * 
 * AsyncWorker Class
 * 
 */
class AsyncWorker
{
public:
    virtual ~AsyncWorker() {
        if (_work != nullptr) {
            napi_delete_async_work(_env, _work);
            _work = nullptr;
        }
    }

    void Queue() {
        napi_status status = napi_queue_async_work(_env, _work);
        NAPI_THROW_IF_FAILED_VOID(_env, status);
    }
    void Cancel() {
        napi_status status = napi_cancel_async_work(_env, _work);
        NAPI_THROW_IF_FAILED_VOID(_env, status);
    }

protected:
    explicit AsyncWorker(Napi::Env env, const char *resource_name, const Napi::Object &resource)
        : _env(env),
          _receiver(),
          _callback(),
          _suppress_destruct(false) {
        napi_value resource_id;
        napi_status status = napi_create_string_latin1(_env, resource_name, NAPI_AUTO_LENGTH, &resource_id);
        NAPI_THROW_IF_FAILED_VOID(_env, status);

        status = napi_create_async_work(_env,
                                        resource,
                                        resource_id,
                                        OnAsyncWorkExecute,
                                        OnAsyncWorkComplete,
                                        this,
                                        &_work);
        NAPI_THROW_IF_FAILED_VOID(_env, status);
    }
    
private:
    napi_env _env;
    napi_async_work _work;
    Napi::ObjectReference _receiver;
    Napi::FunctionReference _callback;
    std::string _error;
    bool _suppress_destruct;
};

/**
 * 
 * #include "node_api.h"
 * 
 * and implementation in "node_api.cc"
 * 
 */
napi_status NAPI_CDECL napi_create_async_work(napi_env env,
                                              napi_value async_resource,
                                              napi_value async_resource_name,
                                              napi_async_execute_callback execute,
                                              napi_async_complete_callback complete,
                                              void *data,
                                              napi_async_work *result) {
    CHECK_ENV(env);
    CHECK_ARG(env, execute);
    CHECK_ARG(env, result);

    v8::Local<v8::Context> context = env->context();

    v8::Local<v8::Object> resource;
    if (async_resource != nullptr) {
        CHECK_TO_OBJECT(env, context, resource, async_resource);
    }
    else {
        resource = v8::Object::New(env->isolate);
    }

    v8::Local<v8::String> resource_name;
    CHECK_TO_STRING(env, context, resource_name, async_resource_name);

    uvimpl::Work *work = uvimpl::Work::New(reinterpret_cast<node_napi_env>(env),
                                                 resource,
                                                 resource_name,
                                                 execute,
                                                 complete,
                                                 data);

    *result = reinterpret_cast<napi_async_work>(work);

    return napi_clear_last_error(env);
}

napi_status NAPI_CDECL napi_get_uv_event_loop(napi_env env, uv_loop_t **loop) {
    CHECK_ENV(env);
    CHECK_ARG(env, loop);
    *loop = reinterpret_cast<node_napi_env>(env)->node_env()->event_loop();
    return napi_clear_last_error(env);
}

napi_status NAPI_CDECL napi_queue_async_work(napi_env env, napi_async_work work) {
    CHECK_ENV(env);
    CHECK_ARG(env, work);

    uv_loop_t *event_loop = nullptr;
    STATUS_CALL(napi_get_uv_event_loop(env, &event_loop));

    uvimpl::Work *w = reinterpret_cast<uvimpl::Work *>(work);

    w->ScheduleWork();

    return napi_clear_last_error(env);
}

namespace uvimpl
{
    class Work : public node::AsyncResource, public node::ThreadPoolWork
    {
    private:
        explicit Work(node_napi_env env,
                      v8::Local<v8::Object> async_resource,
                      v8::Local<v8::String> async_resource_name,
                      napi_async_execute_callback execute,
                      napi_async_complete_callback complete = nullptr,
                      void *data = nullptr)
            : AsyncResource(
                  env->isolate,
                  async_resource,
                  *v8::String::Utf8Value(env->isolate, async_resource_name)),
              ThreadPoolWork(env->node_env(), "node_api"),
              _env(env),
              _data(data),
              _execute(execute),
              _complete(complete) {}

    public:
        void DoThreadPoolWork() override { _execute(_env, _data); }

        void AfterThreadPoolWork(int status) override {
            if (_complete == nullptr)
                return;

            // Establish a handle scope here so that every callback doesn't have to.
            // Also it is needed for the exception-handling below.
            v8::HandleScope scope(_env->isolate);

            CallbackScope callback_scope(this);

            _env->CallbackIntoModule<true>([&](napi_env env)
                                           { _complete(env, ConvertUVErrorCode(status), _data); });

            // Note: Don't access `work` after this point because it was
            // likely deleted by the complete callback.
        }

    private:
        node_napi_env _env;
        void *_data;
        napi_async_execute_callback _execute;
        napi_async_complete_callback _complete;
    };
}



/**
 * 
 * nodejs/node
 * 
 * #include "node_internals.h"
 * #include "threadpoolwork-inl.h"
 * 
 */
namespace node {
    class ThreadPoolWork
    {
    public:
        explicit inline ThreadPoolWork(Environment *env, const char *type)
            : env_(env), type_(type)
        {
            CHECK_NOT_NULL(env);
        }
        inline virtual ~ThreadPoolWork() = default;

        inline void ScheduleWork();
        inline int CancelWork();

        virtual void DoThreadPoolWork() = 0;
        virtual void AfterThreadPoolWork(int status) = 0;

        Environment *env() const { return env_; }

    private:
        Environment *env_;
        uv_work_t work_req_;
        const char *type_;
    };

    void ThreadPoolWork::ScheduleWork() {
        env_->IncreaseWaitingRequestCounter();
        TRACE_EVENT_NESTABLE_ASYNC_BEGIN0(
            TRACING_CATEGORY_NODE2(threadpoolwork, async), type_, this);
        int status = uv_queue_work(
            env_->event_loop(),
            &work_req_,
            [](uv_work_t* req) {
                ThreadPoolWork* self = ContainerOf(&ThreadPoolWork::work_req_, req);
                TRACE_EVENT_BEGIN0(TRACING_CATEGORY_NODE2(threadpoolwork, sync),
                                self->type_);
                self->DoThreadPoolWork();
                TRACE_EVENT_END0(TRACING_CATEGORY_NODE2(threadpoolwork, sync),
                                self->type_);
            },
            [](uv_work_t* req, int status) {
                ThreadPoolWork* self = ContainerOf(&ThreadPoolWork::work_req_, req);
                self->env_->DecreaseWaitingRequestCounter();
                TRACE_EVENT_NESTABLE_ASYNC_END1(
                    TRACING_CATEGORY_NODE2(threadpoolwork, async),
                    self->type_,
                    self,
                    "result",
                    status);
                self->AfterThreadPoolWork(status);
            });
        CHECK_EQ(status, 0);
    }
}




/**
 * 
 * libuv/libuv
 * 
 * #include "uv.h"
 * 
 */
struct uv_loop_t {
  /* User data - use this for whatever. */
  void* data;
  /* Loop reference counting. */
  unsigned int active_handles;
  void* handle_queue[2];
  union {
    void* unused;
    unsigned int count;
  } active_reqs;
  /* Internal storage for future extensions. */
  void* internal_fields;
  /* Internal flag to signal loop stop. */
  unsigned int stop_flag;
  UV_LOOP_PRIVATE_FIELDS
};

typedef void (*uv_work_cb)(uv_work_t* req);

typedef void (*uv_after_work_cb)(uv_work_t* req, int status);

struct uv_work_t {
  UV_REQ_FIELDS
  uv_loop_t* loop;
  uv_work_cb work_cb;
  uv_after_work_cb after_work_cb;
  UV_WORK_PRIVATE_FIELDS
};

UV_EXTERN int uv_queue_work(uv_loop_t* loop,
                            uv_work_t* req,
                            uv_work_cb work_cb,
                            uv_after_work_cb after_work_cb);
```
