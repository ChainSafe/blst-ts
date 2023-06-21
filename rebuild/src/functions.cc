#include "functions.h"

namespace {
Napi::Value AggregatePublicKeys(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    Napi::EscapableHandleScope scope(env);
    if (!info[0].IsArray()) {
        Napi::TypeError::New(env, "publicKeys must be of type PublicKeyArg[]")
            .ThrowAsJavaScriptException();
        return scope.Escape(env.Undefined());
    }
    Napi::Array arr = info[0].As<Napi::Array>();

    BLST_TS_CREAT_UNWRAPPED_OBJECT(public_key, PublicKey, result)
    result->_has_jacobian = true;
    result->_jacobian.reset(new blst::P1);

    for (uint32_t i = 0; i < arr.Length(); i++) {
        Napi::Value val = arr[i];
        blst::P1 pk;
        try {
            BLST_TS_UNWRAP_PUBLIC_KEY_ARG(val, pk, CoordType::Jacobian)
            // TODO: Do we still need to check for 0x40 key?
            // if (key_bytes[0] & 0x40 &&
            //     this->IsZeroBytes(
            //         key_bytes,
            //         1,
            //         _public_keys[_public_keys.GetBadIndex()]
            //             .GetBytesLength())) {
            //     _is_valid = false;
            //     return;
            // }
            result->_jacobian->add(pk);
        } catch (const blst::BLST_ERROR &err) {
            std::ostringstream msg;
            msg << "BLST_ERROR::" << module->GetBlstErrorString(err)
                << ": Invalid key at index " << i;
            Napi::Error::New(env, msg.str()).ThrowAsJavaScriptException();
            return env.Undefined();
        }
    }

    return scope.Escape(wrapped);
}

Napi::Value AggregateSignatures(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    Napi::EscapableHandleScope scope(env);
    if (!info[0].IsArray()) {
        Napi::TypeError::New(env, "signatures must be of type SignatureArg[]")
            .ThrowAsJavaScriptException();
        return scope.Escape(env.Undefined());
    }
    Napi::Array arr = info[0].As<Napi::Array>();

    BLST_TS_CREAT_UNWRAPPED_OBJECT(signature, Signature, result)
    result->_has_jacobian = true;
    result->_jacobian.reset(new blst::P2);

    for (uint32_t i = 0; i < arr.Length(); i++) {
        Napi::Value val = arr[i];
        blst::P2 sig;
        try {
            BLST_TS_UNWRAP_SIGNATURE_ARG(val, sig, CoordType::Jacobian)
            result->_jacobian->add(sig);
        } catch (const blst::BLST_ERROR &err) {
            std::ostringstream msg;
            msg << "BLST_ERROR::" << module->GetBlstErrorString(err)
                << ": Invalid signature at index " << i;
            Napi::Error::New(env, msg.str()).ThrowAsJavaScriptException();
            return env.Undefined();
        }
    }

    return scope.Escape(wrapped);
}

Napi::Value AggregateVerify(const Napi::CallbackInfo &info) {
    return info.Env().Undefined();
}

Napi::Value VerifyMultipleAggregateSignatures(const Napi::CallbackInfo &info) {
    return info.Env().Undefined();
}
}  // anonymous namespace

namespace Functions {
void Init(const Napi::Env &env, Napi::Object &exports) {
    exports.Set(
        Napi::String::New(env, "aggregatePublicKeys"),
        Napi::Function::New(env, AggregatePublicKeys));
    exports.Set(
        Napi::String::New(env, "aggregateSignatures"),
        Napi::Function::New(env, AggregateSignatures));
    exports.Set(
        Napi::String::New(env, "aggregateVerify"),
        Napi::Function::New(env, AggregateVerify));
    exports.Set(
        Napi::String::New(env, "verifyMultipleAggregateSignatures"),
        Napi::Function::New(env, VerifyMultipleAggregateSignatures));
}
}  // namespace Functions