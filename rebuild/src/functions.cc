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
    uint32_t length = arr.Length();
    if (length == 0) {
        Napi::TypeError::New(env, "PublicKeyArg[] must have length > 0")
            .ThrowAsJavaScriptException();
        return scope.Escape(env.Undefined());
    }

    BLST_TS_CREAT_UNWRAPPED_OBJECT(public_key, PublicKey, result)
    result->_has_jacobian = true;
    result->_jacobian.reset(new blst::P1);

    for (uint32_t i = 0; i < length; i++) {
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
    uint32_t length = arr.Length();
    if (length == 0) {
        Napi::TypeError::New(env, "SignatureArg[] must have length > 0")
            .ThrowAsJavaScriptException();
        return scope.Escape(env.Undefined());
    }

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
    Napi::Env env = info.Env();
    Napi::EscapableHandleScope scope(env);
    BlstTsAddon *module = env.GetInstanceData<BlstTsAddon>();
    if (!info[0].IsArray()) {
        Napi::TypeError::New(env, "msgs must be of type BlstBuffer[]")
            .ThrowAsJavaScriptException();
        return scope.Escape(env.Undefined());
    }
    Napi::Array msgs_array = info[1].As<Napi::Array>();
    uint32_t msgs_array_length = msgs_array.Length();
    if (!info[1].IsArray()) {
        Napi::TypeError::New(env, "publicKeys must be of type PublicKeyArg[]")
            .ThrowAsJavaScriptException();
        return scope.Escape(env.Undefined());
    }
    Napi::Array pk_array = info[1].As<Napi::Array>();
    uint32_t pk_array_length = pk_array.Length();
    blst::P2_Affine sig;
    BLST_TS_UNWRAP_SIGNATURE_ARG(info[2], sig, CoordType::Affine)

    if (pk_array_length == 0) {
        if (sig.is_inf()) {
            return scope.Escape(Napi::Boolean::New(env, false));
        }
        Napi::TypeError::New(env, "publicKeys must have length > 0")
            .ThrowAsJavaScriptException();
        return scope.Escape(env.Undefined());
    }
    if (msgs_array_length == 0) {
        Napi::TypeError::New(env, "msgs must have length > 0")
            .ThrowAsJavaScriptException();
        return scope.Escape(env.Undefined());
    }
    if (msgs_array_length != pk_array_length) {
        Napi::TypeError::New(env, "msgs and publicKeys must be the same length")
            .ThrowAsJavaScriptException();
        return scope.Escape(env.Undefined());
    }

    std::unique_ptr<blst::Pairing> ctx{new blst::Pairing(true, module->_dst)};
    for (uint32_t i = 0; i < pk_array_length; i++) {
        blst::P1_Affine pk;
        Napi::Value msg_value = msgs_array[i];
        BLST_TS_UNWRAP_UINT_8_ARRAY(msg_value, msg, "msg")
        BLST_TS_UNWRAP_PUBLIC_KEY_ARG(
            static_cast<Napi::Value>(pk_array[i]), pk, CoordType::Affine)

        blst::BLST_ERROR err =
            ctx->aggregate(&pk, &sig, msg.Data(), msg.ByteLength());
        if (err != blst::BLST_ERROR::BLST_SUCCESS) {
            std::ostringstream msg;
            msg << "BLST_ERROR::" << module->GetBlstErrorString(err)
                << ": Invalid verification aggregate at index " << i;
            Napi::Error::New(env, msg.str()).ThrowAsJavaScriptException();
            return scope.Escape(env.Undefined());
        }
    }

    ctx->commit();
    blst::PT pt{sig};
    return Napi::Boolean::New(env, ctx->finalverify(&pt));
}

typedef struct {
    blst::P1_Affine *pk;
    blst::P2_Affine *sig;
    uint8_t *msg;
    size_t msg_len;
} SignatureSet;

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