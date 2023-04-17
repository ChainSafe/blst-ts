#ifndef BLST_TS_ADDON_H__
#define BLST_TS_ADDON_H__

#include <iostream>
#include <sstream>
#include <memory>
#include <mutex>
#include <openssl/rand.h>
#include <sstream>
#include "napi.h"
#include "blst.hpp"

// TODO: these should come out post PR review
using std::cout;
using std::endl;

#define WORKER_TRY_CATCH_BEGIN               \
    Napi::HandleScope scope(BlstBase::_env); \
    try                                      \
    {

#define WORKER_TRY_CATCH_END(name)                                        \
    }                                                                     \
    catch (Napi::Error &err)                                               \
    {                                                                     \
        SetError(err.Message());                                          \
        goto out_err;                                                     \
    }                                                                     \
    catch (std::exception & err)                                          \
    {                                                                     \
        std::ostringstream msg;                                           \
        msg << "caught exception in " #name ": " << err.what();           \
        SetError(msg.str());                                              \
        goto out_err;                                                     \
    }                                                                     \
    catch (...)                                                           \
    {                                                                     \
        SetError("caught unknown exception in " #name);                   \
        goto out_err;                                                     \
    }                                                                     \
                                                                          \
    out_err:                                                              \
    ThrowJsException();                                                   \
    return BlstBase::_env.Undefined();

class BlstTsAddon;

typedef enum
{
    Affine,
    Jacobian
} CoordType;

class BlstBase
{
public:
    bool HasError() { return _error.size() > 0; };
    std::string GetError() { return _error; };

protected:
    BlstBase(Napi::Env env)
        : _env{env},
          _error{} {};

    void SetError(const std::string &err) { _error = err; };
    void ThrowJsException()
    {
        Napi::Error::New(_env, _error).ThrowAsJavaScriptException();
    };

    // All classes in this library extend BlstBase so store the env here
    Napi::Env _env;
    std::string _error;
};

class BlstAsyncWorker : public BlstBase, public Napi::AsyncWorker
{
public:
    BlstAsyncWorker(const Napi::CallbackInfo &info)
        : BlstBase{info.Env()},
          Napi::AsyncWorker{BlstBase::_env},
          _env{BlstBase::_env},
          _info{info},
          _module{BlstBase::_env.GetInstanceData<BlstTsAddon>()},
          _deferred{BlstBase::_env},
          _use_deferred{false} {};
    /**
     * Runs the worker synchronously with the execution phase on-thread. When
     * running synchronously, the worker should be stack allocated.
     */
    Napi::Value RunSync();
    /**
     * Runs the worker asynchronously and queue's the work for execution by
     * libuv. When running asynchronously, the worker should be heap allocated
     * with `new`. Realistically this should be the only `new`'s in the addon
     * code.
     */
    Napi::Value Run();

protected:
    /**
     * Both BlstBase and Napi::AsyncWorker have an _env member.  Save a ref to
     * the correct one to avoid `BlstBase::_env` sprinkled throughout the code.
     */
    Napi::Env &_env;
    const Napi::CallbackInfo &_info;
    BlstTsAddon *_module;

    /**
     * Pure virtual functions that must be implemented by the function worker to
     * parse the incoming CallbackInfo into native values for the execution
     * phase.  This function will be run on-thread.
     */
    virtual void Setup() = 0;
    /**
     * Pure virtual function that must be implemented by the function worker to
     * get the value returned from the execution phase.  This function will
     * convert the native return value to a Napi::Value and will be run
     * on-thread.
     *
     * @note The AsyncWorker::GetResult also exists but is meant for arguments
     * that would get called to a callback function if using AsyncWorker
     * without promises. Return type overloading is not supported in C++ and
     * only a single return value is supported.
     */
    virtual Napi::Value GetReturnValue() = 0;

    /**
     * Virtual function that overloads by calling both BlstBase::SetError
     * and AsyncWorker::SetError to ensure clean execution.
     * AsyncWorker::_error is a private, not protected, member so it cannot be
     * accessed directly for synchronous execution error reporting.
     */
    virtual void SetError(const std::string &err);

    /**
     * Overload OnOK and make `final` to ensure consumers to not attempt to
     * implement. OnOK is called by the runtime when async work is complete.
     * The runtime will call this function on the main event loop thread. The
     * AsyncWorked class creates a `HandleScope` before calling OnOk.
     *
     * @note https://github.com/nodejs/node-addon-api/blob/d01304437cd4c661f0eda4deb84eb34d7e533f32/napi-inl.h#L5015
     */
    void virtual OnOK() override final;
    /**
     * Overload OnError and make `final` to ensure consumers to not attempt to
     * implement. OnError is called by the runtime when async work is complete.
     * The runtime will call this function on the main event loop thread. The
     * AsyncWorked class creates a `HandleScope` before calling OnError.
     *
     * @note https://github.com/nodejs/node-addon-api/blob/d01304437cd4c661f0eda4deb84eb34d7e533f32/napi-inl.h#L5017
     */
    void virtual OnError(Napi::Error const &err) override final;

private:
    Napi::Promise::Deferred _deferred;
    bool _use_deferred;

    /**
     * GetPromise associated with _deferred for return to JS
     */
    Napi::Promise GetPromise();
};

class Uint8ArrayArg : public BlstBase
{
public:
    Uint8ArrayArg(Napi::Env env)
        : BlstBase{env},
          _error_prefix{},
          _data{nullptr},
          _byte_length{0},
          _ref{} {};
    Uint8ArrayArg(
        Napi::Env env,
        const Napi::Value &val,
        const std::string &err_prefix);

    Uint8ArrayArg &operator=(const Uint8ArrayArg &source) = delete;
    Uint8ArrayArg(const Uint8ArrayArg &source) = delete;
    Uint8ArrayArg &operator=(Uint8ArrayArg &&source) = default;
    Uint8ArrayArg(Uint8ArrayArg &&source) = default;

    const uint8_t *Data();
    size_t ByteLength();
    bool ValidateLength(size_t length1, size_t length2 = 0);

protected:
    std::string _error_prefix;

private:
    uint8_t *_data;
    size_t _byte_length;
    Napi::Reference<Napi::Uint8Array> _ref;
};

class Uint8ArrayArgArray : public BlstBase
{
public:
    Uint8ArrayArgArray(
        Napi::Env env,
        const Napi::Value &arr_val,
        const std::string &err_prefix_singular,
        const std::string &err_prefix_plural);
    Uint8ArrayArgArray(const Uint8ArrayArgArray &source) = delete;
    Uint8ArrayArgArray(Uint8ArrayArgArray &&source) = default;

    Uint8ArrayArgArray &operator=(const Uint8ArrayArgArray &source) = delete;
    Uint8ArrayArgArray &operator=(Uint8ArrayArgArray &&source) = delete;
    Uint8ArrayArg &operator[](size_t index) { return _args[index]; }

    size_t Size() { return _args.size(); }
    void Reserve(size_t size) { return _args.reserve(size); }

private:
    std::vector<Uint8ArrayArg> _args;
};

// #include "secret_key.h"
// #include "public_key.h"
// #include "signature.h"

class BlstTsAddon : public Napi::Addon<BlstTsAddon>
{
public:
    std::string _dst;
    size_t _secret_key_length;
    size_t _public_key_compressed_length;
    size_t _public_key_uncompressed_length;
    size_t _signature_compressed_length;
    size_t _signature_uncompressed_length;
    size_t _random_bytes_length;
    std::string _blst_error_strings[8];
    // Napi::FunctionReference _secret_key_ctr;
    // Napi::FunctionReference _public_key_ctr;
    // Napi::FunctionReference _signature_ctr;

    BlstTsAddon(Napi::Env env, Napi::Object exports);

    BlstTsAddon(BlstTsAddon &&source) = delete;
    BlstTsAddon(const BlstTsAddon &source) = delete;
    BlstTsAddon &operator=(BlstTsAddon &&source) = delete;
    BlstTsAddon &operator=(const BlstTsAddon &source) = delete;

    /**
     * Converts a blst error to an error string
     */
    std::string GetBlstErrorString(const blst::BLST_ERROR &err);

    /**
     * Uses the same openssl method as node to generate random bytes
     */
    bool GetRandomBytes(blst::byte *ikm, size_t length);

    Napi::Value RunTest(const Napi::CallbackInfo &info);

private:
    /**
     *  Creates a constants objects to pass to JS
     */
    Napi::Object BuildJsConstants(Napi::Env &env);
};

#endif /* BLST_TS_ADDON_H__ */