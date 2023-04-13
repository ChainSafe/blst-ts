#ifndef BLST_TS_ADDON_H__
#define BLST_TS_ADDON_H__

#include <iostream>
#include <memory>
#include <mutex>
#include <openssl/rand.h>
#include <sstream>
#include "napi.h"
#include "blst.hpp"

// TODO: these should come out post PR review
using std::cout;
using std::endl;

class BlstTsAddon;

typedef enum
{
    Affine,
    Jacobian
} CoordType;

class BlstAsyncWorker : public Napi::AsyncWorker
{
public:
    BlstAsyncWorker(const Napi::CallbackInfo &info) : Napi::AsyncWorker{info.Env()},
                                                      _info{info},
                                                      _env{Env()},
                                                      _module{_env.GetInstanceData<BlstTsAddon>()},
                                                      _deferred{_env},
                                                      _use_deferred{false},
                                                      _error{} {};
    Napi::Value RunSync();
    Napi::Value Run();
    void ThrowJsException() { Napi::Error::New(_env, _error).ThrowAsJavaScriptException(); };
    bool HasError() { return _error.size() > 0; };
    std::string GetError() { return _error; };

protected:
    const Napi::CallbackInfo &_info;
    Napi::Env _env;
    BlstTsAddon *_module;

    // pure virtual functions that must be implemented by the function worker
    virtual void Setup() = 0;
    virtual Napi::Value GetReturnValue() = 0;

    virtual void SetError(const std::string &err);

    void virtual OnOK() override final;
    void virtual OnError(Napi::Error const &err) override final;
    Napi::Promise GetPromise();

private:
    Napi::Promise::Deferred _deferred;
    bool _use_deferred;
    std::string _error;
};

class Uint8ArrayArg
{
public:
    Uint8ArrayArg(const Napi::Env &env) : _env{env},
                                          _error_prefix{},
                                          _error{},
                                          _data{nullptr},
                                          _byte_length{0} {};
    Uint8ArrayArg(
        const Napi::Env &env,
        const Napi::Value &val,
        const std::string &err_prefix);

    Uint8ArrayArg &operator=(const Uint8ArrayArg &source) = delete;
    Uint8ArrayArg(const Uint8ArrayArg &source) = delete;
    Uint8ArrayArg &operator=(Uint8ArrayArg &&source) = default;
    Uint8ArrayArg(Uint8ArrayArg &&source) = default;

    const uint8_t *Data();
    size_t ByteLength();
    void ThrowJsException() { Napi::Error::New(_env, _error).ThrowAsJavaScriptException(); };
    bool HasError() { return _error.size() > 0; };
    std::string GetError() { return _error; };
    bool ValidateLength(size_t length1, size_t length2 = 0);

protected:
    Napi::Env _env;
    std::string _error_prefix;
    std::string _error;

    void SetError(const std::string &err) { _error = err; };

private:
    uint8_t *_data;
    size_t _byte_length;
    Napi::Reference<Napi::Uint8Array> _ref;
};

class Uint8ArrayArgArray
{
public:
    Uint8ArrayArgArray(
        const Napi::Env &env,
        const Napi::Value &arr_val,
        const std::string &err_prefix_singular,
        const std::string &err_prefix_plural);
    Uint8ArrayArgArray(const Uint8ArrayArgArray &source) = delete;
    Uint8ArrayArgArray(Uint8ArrayArgArray &&source) = default;

    Uint8ArrayArgArray &operator=(const Uint8ArrayArgArray &source) = delete;
    Uint8ArrayArgArray &operator=(Uint8ArrayArgArray &&source) = default;
    Uint8ArrayArg &operator[](size_t index) { return _args[index]; }

    size_t Size() { return _args.size(); }
    void Reserve(size_t size) { return _args.reserve(size); }
    void ThrowJsException() { Napi::Error::New(_env, _error).ThrowAsJavaScriptException(); };
    bool HasError() { return _error.size() > 0; };
    std::string GetError() { return _error; };

private:
    Napi::Env _env;
    std::string _error;
    std::vector<Uint8ArrayArg> _args;

    void SetError(const std::string &err) { _error = err; };
};

#include "secret_key.h"
#include "public_key.h"
#include "signature.h"

/**
 * Idea for implementation of GlobalState
 * https://github.com/nodejs/node-addon-api/issues/567
 */
class GlobalState
{
public:
    std::string _dst;
    size_t _random_bytes_length;
    size_t _secret_key_length;
    size_t _public_key_compressed_length;
    size_t _public_key_uncompressed_length;
    size_t _signature_compressed_length;
    size_t _signature_uncompressed_length;
    std::string _secret_key_type;
    std::string _public_key_type;
    std::string _signature_type;
    std::string _blst_error_strings[8];

    GlobalState();
    GlobalState(GlobalState &&source) = delete;
    GlobalState(const GlobalState &source) = delete;
    GlobalState &operator=(GlobalState &&source) = delete;
    GlobalState &operator=(const GlobalState &source) = delete;

    static std::shared_ptr<GlobalState> GetInstance(BlstTsAddon *addon);

private:
    static std::mutex _lock;
};

class BlstTsAddon : public Napi::Addon<BlstTsAddon>
{
public:
    std::shared_ptr<GlobalState> _global_state = GlobalState::GetInstance(this);
    Napi::Object _js_constants;
    Napi::FunctionReference _secret_key_ctr;
    Napi::FunctionReference _public_key_ctr;
    Napi::FunctionReference _signature_ctr;

    BlstTsAddon(Napi::Env env, Napi::Object exports);
    BlstTsAddon(BlstTsAddon &&source) = delete;
    BlstTsAddon(const BlstTsAddon &source) = delete;
    BlstTsAddon &operator=(BlstTsAddon &&source) = delete;
    BlstTsAddon &operator=(const BlstTsAddon &source) = delete;

    std::string GetBlstErrorString(const blst::BLST_ERROR &err);
    void GetRandomBytes(blst::byte *ikm, size_t length);

    Napi::Value TestSync(const Napi::CallbackInfo &info);
    Napi::Value TestAsync(const Napi::CallbackInfo &info);

private:
    void BuildJsConstants(Napi::Env &env);
};

#endif /* BLST_TS_ADDON_H__ */