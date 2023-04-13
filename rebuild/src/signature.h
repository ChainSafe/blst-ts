#ifndef BLST_TS_SIGNATURE_H__
#define BLST_TS_SIGNATURE_H__

#include <memory>
#include "napi.h"
#include "blst.hpp"
#include "addon.h"

class Signature : public Napi::ObjectWrap<Signature>
{
public:
    bool _is_jacobian;
    std::unique_ptr<blst::P2> _jacobian;
    std::unique_ptr<blst::P2_Affine> _affine;

    static void Init(const Napi::Env &env, Napi::Object &exports, BlstTsAddon *module);
    static Napi::Value Deserialize(const Napi::CallbackInfo &info);
    Signature(const Napi::CallbackInfo &info);
    Napi::Value Serialize(const Napi::CallbackInfo &info);
    Napi::Value SigValidate(const Napi::CallbackInfo &info);
    Napi::Value SigValidateSync(const Napi::CallbackInfo &info);

private:
    BlstTsAddon *_module;
};

class SignatureArg
{
public:
    SignatureArg(const BlstTsAddon *addon, const Napi::Env &env);
    SignatureArg(const BlstTsAddon *addon, const Napi::Env &env, const Napi::Value &raw_arg);
    SignatureArg(const SignatureArg &source) = delete;
    SignatureArg(SignatureArg &&source) = default;

    SignatureArg &operator=(const SignatureArg &source) = delete;
    SignatureArg &operator=(SignatureArg &&source) = default;

    const blst::P2 *AsJacobian();
    const blst::P2_Affine *AsAffine();
    void ThrowJsException() { Napi::Error::New(_env, _error).ThrowAsJavaScriptException(); };
    bool HasError() { return _error.size() > 0; };
    std::string GetError() { return _error; };

private:
    const BlstTsAddon *_addon;
    Napi::Env _env;
    std::string _error;
    std::unique_ptr<blst::P2> _jacobian;
    std::unique_ptr<blst::P2_Affine> _affine;
    Signature *_signature;
    Uint8ArrayArg _bytes;

    void SetError(const std::string &err) { _error = err; };
};

class SignatureArgArray
{
public:
    SignatureArgArray(const BlstTsAddon *module, const Napi::Env &env, const Napi::Value &raw_arg);
    SignatureArgArray(const SignatureArgArray &source) = delete;
    SignatureArgArray(SignatureArgArray &&source) = default;

    SignatureArgArray &operator=(const SignatureArgArray &source) = delete;
    SignatureArgArray &operator=(SignatureArgArray &&source) = default;
    SignatureArg &operator[](size_t index)
    {
        return _signatures[index];
    }

    size_t Size() { return _signatures.size(); }
    void Reserve(size_t size) { return _signatures.reserve(size); }
    void ThrowJsException() { Napi::Error::New(_env, _error).ThrowAsJavaScriptException(); };
    bool HasError() { return _error.size() > 0; };
    std::string GetError() { return _error; };

private:
    Napi::Env _env;
    std::string _error;
    std::vector<SignatureArg> _signatures;

    void SetError(const std::string &err) { _error = err; };
};

#endif /* BLST_TS_SIGNATURE_H__ */