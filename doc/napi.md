# Node.js C/C++ Addons

Running "native" code via node.js is nothing new.  What has changed over the years is how native modules are built.  Originally they were build by calling the underlying libraries like `v8` and `libuv` directly.  All people would do was bring in a header file and off they went, roughly...

There were lots of internal API changes that were breaking and addon code needed to be updated for each library change so gyp would build.  I remember fondly watching c compile v8 warnings on `npm install` in the early days.  NAN was created as an open source alternative to ease the maintenance burden and it was popular enough that the node team built in something similar.

Que `Node-API`

Node is a `C++` application so one would think that exporting a `C++` api would be the thing to do.  But for portability the team create a `C` API and this design decision has opened up node to every language that is compatible with a `C` abi.  That is most btw.  It is technically possible to write node addons in C, C++, Rust, Go, Java, C#, etc...

## Overview of `Node-API` and `node-addon-api`

While its possible to write native addons in most languages, the two that are officially supported are `C` and `C++`, hence `Node-API` and `node-addon-api`. &nbsp;&nbsp;`Node-API` is built and compiled in with node so those tokens are available at runtime to any dynamically linked library.  All that is necessary to use it is the header file `node_api.h` which can be found [here](https://github.com/nodejs/node/blob/main/src/node_api.h). `node-addon-api` is a header-only `C++` library that is published and installed via [npm](https://www.npmjs.com/package/node-addon-api).  It is broken into two files [napi.h](https://github.com/nodejs/node-addon-api/blob/main/napi.h), which has all of the class definitions, and [napi-inl.h](https://github.com/nodejs/node-addon-api/blob/main/napi-inl.h) that contains the function implementations.

We are going to look at async work as an example and analyze how the two pieces fit together, how "`c`" code patterns and "`C++`" patterns interact, how best-practice `C++` code is structured and how the napi code actually interacts with `v8` and `libuv`.

## AsyncWorker Class

## `napi_*_async_work` Function Implementations

## Full Async Implementations

```c++
/**
 * #include "uv.h"
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

/**
 * #include "node_internals.h"
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
 * #include "node_api.h"
 * and implementation in "node_api.cc"
 */
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

} // end of namespace uvimpl

napi_status NAPI_CDECL napi_create_async_work(napi_env env,
                                              napi_value async_resource,
                                              napi_value async_resource_name,
                                              napi_async_execute_callback execute,
                                              napi_async_complete_callback complete,
                                              void *data,
                                              napi_async_work *result)
{
    CHECK_ENV(env);
    CHECK_ARG(env, execute);
    CHECK_ARG(env, result);

    v8::Local<v8::Context> context = env->context();

    v8::Local<v8::Object> resource;
    if (async_resource != nullptr)
    {
        CHECK_TO_OBJECT(env, context, resource, async_resource);
    }
    else
    {
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

napi_status NAPI_CDECL napi_delete_async_work(napi_env env,
                                              napi_async_work work)
{
    CHECK_ENV(env);
    CHECK_ARG(env, work);

    uvimpl::Work::Delete(reinterpret_cast<uvimpl::Work *>(work));

    return napi_clear_last_error(env);
}

napi_status NAPI_CDECL napi_get_uv_event_loop(napi_env env, uv_loop_t **loop)
{
    CHECK_ENV(env);
    CHECK_ARG(env, loop);
    *loop = reinterpret_cast<node_napi_env>(env)->node_env()->event_loop();
    return napi_clear_last_error(env);
}

napi_status NAPI_CDECL napi_queue_async_work(napi_env env,
                                             napi_async_work work)
{
    CHECK_ENV(env);
    CHECK_ARG(env, work);

    uv_loop_t *event_loop = nullptr;
    STATUS_CALL(napi_get_uv_event_loop(env, &event_loop));

    uvimpl::Work *w = reinterpret_cast<uvimpl::Work *>(work);

    w->ScheduleWork();

    return napi_clear_last_error(env);
}

napi_status NAPI_CDECL napi_cancel_async_work(napi_env env,
                                              napi_async_work work)
{
    CHECK_ENV(env);
    CHECK_ARG(env, work);

    uvimpl::Work *w = reinterpret_cast<uvimpl::Work *>(work);

    CALL_UV(env, w->CancelWork());

    return napi_clear_last_error(env);
}

/**
 * 
 * 
 * AsyncWorker Class
 * 
 * 
 */
class AsyncWorker
{
public:
    virtual ~AsyncWorker()
    {
        if (_work != nullptr)
        {
            napi_delete_async_work(_env, _work);
            _work = nullptr;
        }
    }

    NAPI_DISALLOW_ASSIGN_COPY(AsyncWorker)

    operator napi_async_work() const
    {
        return _work;
    }
    Napi::Env Env() const
    {
        return Napi::Env(_env);
    }

    void Queue()
    {
        napi_status status = napi_queue_async_work(_env, _work);
        NAPI_THROW_IF_FAILED_VOID(_env, status);
    }
    void Cancel()
    {
        napi_status status = napi_cancel_async_work(_env, _work);
        NAPI_THROW_IF_FAILED_VOID(_env, status);
    }
    void SuppressDestruct()
    {
        _suppress_destruct = true;
    }

    Napi::ObjectReference &Receiver()
    {
        return _receiver;
    }
    Napi::FunctionReference &Callback()
    {
        return _callback;
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
          _suppress_destruct(false)
    {
        napi_value resource_id;
        napi_status status = napi_create_string_latin1(
            _env, resource_name, NAPI_AUTO_LENGTH, &resource_id);
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
    explicit AsyncWorker(const Napi::Function &callback)
        : AsyncWorker(callback, "generic") {}
    explicit AsyncWorker(const Napi::Function &callback, const char *resource_name)
        : AsyncWorker(callback, resource_name, Napi::Object::New(callback.Env())) {}
    explicit AsyncWorker(const Napi::Function &callback, const char *resource_name, const Napi::Object &resource)
        : AsyncWorker(Napi::Object::New(callback.Env()), callback, resource_name, resource) {}
    explicit AsyncWorker(const Napi::Object &receiver, const Napi::Function &callback)
        : AsyncWorker(receiver, callback, "generic") {}
    explicit AsyncWorker(const Napi::Object &receiver, const Napi::Function &callback, const char *resource_name)
        : AsyncWorker(receiver, callback, resource_name, Napi::Object::New(callback.Env())) {}
    explicit AsyncWorker(const Napi::Object &receiver, const Napi::Function &callback, const char *resource_name, const Napi::Object &resource)
        : _env(callback.Env()),
          _receiver(Napi::Persistent(receiver)),
          _callback(Napi::Persistent(callback)),
          _suppress_destruct(false)
    {
        napi_value resource_id;
        napi_status status = napi_create_string_latin1(
            _env, resource_name, NAPI_AUTO_LENGTH, &resource_id);
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
    virtual void OnOK()
    {
        if (!_callback.IsEmpty())
        {
            _callback.Call(_receiver.Value(), GetResult(_callback.Env()));
        }
    }
    virtual void OnError(const Napi::Error &e)
    {
        if (!_callback.IsEmpty())
        {
            _callback.Call(_receiver.Value(), std::initializer_list<napi_value>{e.Value()});
        }
    }
    virtual void Destroy()
    {
        delete this;
    };
    virtual std::vector<napi_value> GetResult(Napi::Env env)
    {
        return {};
    }

    void SetError(const std::string &error)
    {
        _error = error;
    }

private:
    static inline void OnAsyncWorkExecute(napi_env env, void *asyncworker)
    {
        AsyncWorker *self = static_cast<AsyncWorker *>(asyncworker);
        self->OnExecute(env);
    }
    void AsyncWorker::OnExecute(Napi::Env /*DO_NOT_USE*/)
    {
#ifdef NAPI_CPP_EXCEPTIONS
        try
        {
            Execute();
        }
        catch (const std::exception &e)
        {
            SetError(e.what());
        }
#else  // NAPI_CPP_EXCEPTIONS
        Execute();
#endif // NAPI_CPP_EXCEPTIONS
    }
    static inline void OnAsyncWorkComplete(napi_env env, napi_status status, void *asyncworker)
    {
        AsyncWorker *self = static_cast<AsyncWorker *>(asyncworker);
        self->OnWorkComplete(env, status);
    }
    inline void AsyncWorker::OnWorkComplete(Napi::Env /*env*/, napi_status status)
    {
        if (status != napi_cancelled)
        {
            Napi::HandleScope scope(_env);
            Napi::details::WrapCallback([&]
                                        {
                if (_error.size() == 0) {
                    OnOK();
                } else {
                    OnError(Napi::Error::New(_env, _error));
                }
                return nullptr; });
        }
        if (!_suppress_destruct)
        {
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
```