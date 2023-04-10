# Reference

## Dumping Ground

At the moment this is sort of a dumping ground for stuff that was written but didn't really fit in the section it was written.

There are a lot of good resource on the web and there is a curated list of resources so there is no need to reinvent the wheel.

Seeing as we are building bindings, this guide would be incomplete without a discussion on binding data from `C` for JS usage and vice versa.

What does this mean...
["// Allow placement new."](https://github.com/nodejs/node/blob/4166d40d0873b6d8a0c7291872c8d20dc680b1d7/deps/v8/src/handles/handles.h#L211)

, how best-practice `C++` code is structured and how the napi code actually interacts with `v8` and `libuv`.

## Handles, Objects and Values

How these three things relate is an implementation detail and should not be relied upon. It is however presented to provide some context for what `HandleScope` is doing under the hood


## `Napi::Value` Inheritance Hierarchy

This inheritance hierarchy for `Napi::Value` was built from [this](https://github.com/nodejs/node-addon-api/blob/main/napi.h) file.

```c++
class Boolean : public Value {}
class Number : public Value {}
class Number : public Value {}
class BigInt : public Value {}
class Date : public Value {}

class Name : public Value {}
class String : public Name {}
class Symbol : public Name {}

class TypeTaggable : public Value {}
class External : public TypeTaggable {}
class Object : public TypeTaggable {}

class Array : public Object {}
class Function : public Object {}
class Promise : public Object {}
class DataView : public Object {}
class ArrayBuffer : public Object {}
class TypedArray : public Object {}

template <typename T>
class TypedArrayOf : public TypedArray {}
using Uint8Array = TypedArrayOf<uint8_t>;
class Buffer : public Uint8Array {}
```

## Object Inheritance Hierarchy

Found [here](https://github.com/nodejs/node/blob/4166d40d0873b6d8a0c7291872c8d20dc680b1d7/deps/v8/src/objects/objects.h#L36)

```c++
//
// Most object types in the V8 JavaScript are described in this file.
//
// Inheritance hierarchy:
// - Object
//   - Smi          (immediate small integer)
//   - TaggedIndex  (properly sign-extended immediate small integer)
//   - HeapObject   (superclass for everything allocated in the heap)
//     - JSReceiver  (suitable for property access)
//     - FixedArrayBase
//     - PrimitiveHeapObject
//     - Context
//       - NativeContext
//     - Cell
//     - DescriptorArray
//     - PropertyCell
//     - PropertyArray
//     - Code
//     - AbstractCode, a wrapper around Code or BytecodeArray
//     - Map
//     - Foreign
//     - SmallOrderedHashTable
//       - SmallOrderedHashMap
//       - SmallOrderedHashSet
//     - SharedFunctionInfo
//     - Struct
//     - FeedbackCell
//     - FeedbackVector
//     - PreparseData
//     - UncompiledData
//       - UncompiledDataWithoutPreparseData
//       - UncompiledDataWithPreparseData
//     - SwissNameDictionary
//
// Formats of Object::ptr_:
//  Smi:        [31 bit signed int] 0
//  HeapObject: [32 bit direct pointer] (4 byte aligned) | 01
```

### `JSReciever`

```c++
//- JSProxy
//- JSObject
//  - JSArray
//    - TemplateLiteralObject
//  - JSArrayBuffer
//  - JSArrayBufferView
//    - JSTypedArray
//    - JSDataView
//  - JSCollection
//    - JSSet
//    - JSMap
//  - JSCustomElementsObject (may have elements despite empty Fiy)
//    - JSSpecialObject (requires custom property lookup ha
//      - JS
//      - JSGlobalProxy
//      - JSModuleNamespace
//    - JSPrimitiveWrapper
//  - JSDate
//  - JSFunctionOrBoundFunctionOrWrappedFunction
//    - JSBoundFunction
//    - JSFunction
//    - JSWrappedFunction
//  - JSGeneratorObject
//  - JSMapIterator
//  - JSMessageObject
//  - JSRegExp
//  - JSSetIterator
//  - JSShadowRealm
//  - JSSharedStruct
//  - JSStringIterator
//  - JSTemporalCalendar
//  - JSTemporalDuration
//  - JSTemporalInstant
//  - JSTemporalPlainDate
//  - JSTemporalPlainDateTime
//  - JSTemporalPlainMonthDay
//  - JSTemporalPlainTime
//  - JSTemporalPlainYearMonth
//  - JSTemporalTimeZone
//  - JSTemporalZonedDateTime
//  - JSWeakCollection
//    - JSWeakMap
//    - JSWeakSet
//  - JSCollator            // If V8_INTL_SUPPORT enabled.
//  - JSDateTimeFormat      // If V8_INTL_SUPPORT enabled.
//  - JSDisplayNames        // If V8_INTL_SUPPORT enabled.
//  - JSDurationFormat      // If V8_INTL_SUPPORT enabled.
//  - JSListFormat          // If V8_INTL_SUPPORT enabled.
//  - JSLocale              // If V8_INTL_SUPPORT enabled.
//  - JSNumberFormat        // If V8_INTL_SUPPORT enabled.
//  - JSPluralRules         // If V8_INTL_SUPPORT enabled.
//  - JSRelativeTimeFormat  // If V8_INTL_SUPPORT enabled.
//  - JSSegmenter           // If V8_INTL_SUPPORT enabled.
//  - JSSegments            // If V8_INTL_SUPPORT enabled.
//  - JSSegmentIterator     // If V8_INTL_SUPPORT enabled.
//  - JSV8BreakIterator     // If V8_INTL_SUPPORT enabled.
//  - WasmExceptionPackage
//  - WasmTagObject
//  - WasmGlobalObject
//  - WasmInstanceObject
//  - WasmMemoryObject
//  - WasmModuleObject
//  - WasmTableObject
//  - WasmSuspenderObject
```

### `FixedArrayBase`

```c++
//  - ByteArray
//  - BytecodeArray
//  - FixedArray
//    - HashTable
//      - Dictionary
//      - StringTable
//      - StringSet
//      - CompilationCacheTable
//      - MapCache
//    - OrderedHashTable
//      - OrderedHashSet
//      - OrderedHashMap
//    - FeedbackMetadata
//    - TemplateList
//    - TransitionArray
//    - ScopeInfo
//    - SourceTextModuleInfo
//    - ScriptContextTable
//    - ClosureFeedbackCellArray
//  - FixedDoubleArray
```

### `PrimitiveHeapObject`

```c++
//  - BigInt
//  - HeapNumber
//  - Name
//    - Symbol
//    - String
//      - SeqString
//        - SeqOneByteString
//        - SeqTwoByteString
//      - SlicedString
//      - ConsString
//      - ThinString
//      - ExternalString
//        - ExternalOneByteString
//        - ExternalTwoByteString
//      - InternalizedString
//        - SeqInternalizedString
//          - SeqOneByteInternalizedString
//          - SeqTwoByteInternalizedString
//        - ConsInternalizedString
//        - ExternalInternalizedString
//          - ExternalOneByteInternalizedString
//          - ExternalTwoByteInternalizedString
//  - Oddball
```

### `Struct`

```c++
//  - AccessorInfo
//  - AsmWasmData
//  - PromiseReaction
//  - PromiseCapability
//  - AccessorPair
//  - AccessCheckInfo
//  - InterceptorInfo
//  - CallHandlerInfo
//  - EnumCache
//  - TemplateInfo
//    - FunctionTemplateInfo
//    - ObjectTemplateInfo
//  - Script
//  - DebugInfo
//  - BreakPoint
//  - BreakPointInfo
//  - CallSiteInfo
//  - CodeCache
//  - PropertyDescriptorObject
//  - PromiseOnStack
//  - PrototypeInfo
//  - Microtask
//    - CallbackTask
//    - CallableTask
//    - PromiseReactionJobTask
//      - PromiseFulfillReactionJobTask
//      - PromiseRejectReactionJobTask
//    - PromiseResolveThenableJobTask
//  - Module
//    - SourceTextModule
//    - SyntheticModule
//  - SourceTextModuleInfoEntry
//  - StackFrameInfo
```

## Full Async Implementations

### `node-addon-api`

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
```

### `Node-API`

```c++
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
```

### Node Internals

```c++
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
```

### `libuv`

```c++
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
