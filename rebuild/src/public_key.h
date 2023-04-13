#ifndef BLST_TS_PUBLIC_KEY_H__
#define BLST_TS_PUBLIC_KEY_H__

#include <memory>
#include "napi.h"
#include "blst.hpp"
#include "addon.h"

class PublicKey : public Napi::ObjectWrap<PublicKey>
{
public:
    bool _is_jacobian;
    std::unique_ptr<blst::P1> _jacobian;
    std::unique_ptr<blst::P1_Affine> _affine;

    static void Init(const Napi::Env &env, Napi::Object &exports, BlstTsAddon *module);
    static Napi::Value Deserialize(const Napi::CallbackInfo &info);
    PublicKey(const Napi::CallbackInfo &info);
    Napi::Value Serialize(const Napi::CallbackInfo &info);
    Napi::Value KeyValidate(const Napi::CallbackInfo &info);
    Napi::Value KeyValidateSync(const Napi::CallbackInfo &info);

private:
    BlstTsAddon &_module;
};

class PublicKeyArg
{
public:
    PublicKeyArg(const BlstTsAddon *addon, const Napi::Env &env);
    PublicKeyArg(const BlstTsAddon *addon, const Napi::Env &env, const Napi::Value &raw_arg);
    PublicKeyArg(const PublicKeyArg &source) = delete;
    PublicKeyArg(PublicKeyArg &&source) = default;

    PublicKeyArg &operator=(const PublicKeyArg &source) = delete;
    PublicKeyArg &operator=(PublicKeyArg &&source) = default;

    blst::P1 *AsJacobian();
    blst::P1_Affine *AsAffine();
    void ThrowJsException() { Napi::Error::New(_env, _error).ThrowAsJavaScriptException(); };
    bool HasError() { return _error.size() > 0; };
    std::string GetError() { return _error; };

private:
    const BlstTsAddon *_addon;
    Napi::Env _env;
    std::string _error;
    std::unique_ptr<blst::P1> _jacobian;
    std::unique_ptr<blst::P1_Affine> _affine;
    PublicKey *_public_key;
    Uint8ArrayArg _bytes;

    void SetError(const std::string &err) { _error = err; };
};

class PublicKeyArgArray
{
public:
    PublicKeyArgArray(
        const BlstTsAddon *module,
        const Napi::Env &env,
        const Napi::Value &raw_arg);
    PublicKeyArgArray(const PublicKeyArgArray &source) = delete;
    PublicKeyArgArray(PublicKeyArgArray &&source) = default;

    PublicKeyArgArray &operator=(const PublicKeyArgArray &source) = delete;
    PublicKeyArgArray &operator=(PublicKeyArgArray &&source) = default;
    PublicKeyArg &operator[](size_t index)
    {
        return _keys[index];
    }

    size_t Size() { return _keys.size(); }
    void Reserve(size_t size) { return _keys.reserve(size); }
    void ThrowJsException() { Napi::Error::New(_env, _error).ThrowAsJavaScriptException(); };
    bool HasError() { return _error.size() > 0; };
    std::string GetError() { return _error; };

private:
    Napi::Env _env;
    std::string _error;
    std::vector<PublicKeyArg> _keys;

    void SetError(const std::string &err) { _error = err; };
};

#endif /* BLST_TS_PUBLIC_KEY_H__ */