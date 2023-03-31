# Multi-Threading

It is possible to achieve multi-threading in a couple of ways with native `node` modules.  The first option is to use `node` threads and let `libuv` do the scheduling of work.  The second is to use native `c`-level `std::thread`(s).  A third method is to use the two together in tandem.

This library was first implemented using the third method and then rewritten to use the first.  We will discuss them all in turn though.

## `node.js` Multi-Threading

The most predictable way to handle multi-threading is to use the build-in thread pool that ships with `node`.  It is the magic behind "single-threaded execution" that makes `node` so easy to reason about.  This method was ultimately implemented.

Work is submitted to the thread-pool and queued for execution in the order it was received.  There are a number of constructs available through `n-api` and the discussion of several can be found in the [`n-api`](./napi.md) overview.

The functions that are used by `blst-ts` are the `napi_*_async_work` functions.  They are implemented using the `Napi::AsyncWorker` class.  The constructor and destructor call `napi_create_async_work` and `napi_delete_async_work` respectively.  `Napi::AsyncWorker::Queue` is responsible for calling `napi_queue_async_work`.  You can see the implementation of [napi_create_async_work](https://github.com/nodejs/node/blob/4166d40d0873b6d8a0c7291872c8d20dc680b1d7/src/node_api.cc#L1138) to get an idea of how `node-addon-api` relates to `n-api`  and how that integrates with underlying `v8` and `libuv` libraries.

## `std::thread` Multi-Threading

Start from a basis that using native threads by themselves is not a great solution.  It implies spawning native c threads while on the JS thread.  Not only will the function call be blocking, but the native threads will compete with the `libuv` threads and there will be thread-level context switching.  No bueno...

## Mixed Multi-Threading

In the first pass of building the `@chainsafe/blst-ts` library this is the approach that was attempted.

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

    virtual void OnExecute(Napi::Env env);
    virtual void OnWorkComplete(Napi::Env env, napi_status status);

protected:
    explicit AsyncWorker(Napi::Env env)
        : AsyncWorker(env, "generic") {}
    explicit AsyncWorker(Napi::Env env, const char *resource_name)
        : AsyncWorker(env, resource_name, Napi::Object::New(env)) {}
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
    
    virtual void Execute() = 0;
    virtual void OnOK() {
        if (!_callback.IsEmpty()) {
            _callback.Call(_receiver.Value(), GetResult(_callback.Env()));
        }
    }
    virtual void OnError(const Napi::Error &e) {
        if (!_callback.IsEmpty())
        {
            _callback.Call(_receiver.Value(), std::initializer_list<napi_value>{e.Value()});
        }
    }
    virtual void Destroy() {
        delete this;
    };
    virtual std::vector<napi_value> GetResult(Napi::Env env) {
        return {};
    }

    void SetError(const std::string &error) {
        _error = error;
    }

private:
    void AsyncWorker::OnExecute(Napi::Env /*DO_NOT_USE*/) {
        try {
            Execute();
        }
        catch (const std::exception &e) {
            SetError(e.what());
        }
    }
    inline void AsyncWorker::OnWorkComplete(Napi::Env /*env*/, napi_status status) {
        if (status != napi_cancelled) {
            Napi::HandleScope scope(_env);
            Napi::details::WrapCallback([&]() {
                if (_error.size() == 0) {
                    OnOK();
                } else {
                    OnError(Napi::Error::New(_env, _error));
                }
                return nullptr;
            });
        }
        if (!_suppress_destruct) {
            Destroy();
        }
    }

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
    static napi_status ConvertUVErrorCode(int code)
    {
        switch (code)
        {
        case 0:
            return napi_ok;
        case UV_EINVAL:
            return napi_invalid_arg;
        case UV_ECANCELED:
            return napi_cancelled;
        default:
            return napi_generic_failure;
        }
    }

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

        ~Work() override = default;

    public:
        static Work *New(node_napi_env env,
                         v8::Local<v8::Object> async_resource,
                         v8::Local<v8::String> async_resource_name,
                         napi_async_execute_callback execute,
                         napi_async_complete_callback complete,
                         void *data)
        {
            return new Work(
                env, async_resource, async_resource_name, execute, complete, data);
        }

        static void Delete(Work *work) { delete work; }

        void DoThreadPoolWork() override { _execute(_env, _data); }

        void AfterThreadPoolWork(int status) override
        {
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
 * 
 * #include "node_internals.h"
 * 
 * 
 */
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


/**
 * 
 * libuv library
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
```
