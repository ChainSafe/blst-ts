#include "functions.h"

namespace {
Napi::Value AggregatePublicKeys(const Napi::CallbackInfo &info) {
    BLST_TS_FUNCTION_PREAMBLE
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
        std::unique_ptr<blst::P1> p_pk{nullptr};
        blst::P1 *pk = nullptr;
        try {
            BLST_TS_UNWRAP_POINT_ARG(
                val,
                p_pk,
                pk,
                public_key,
                PublicKey,
                PUBLIC_KEY,
                "PublicKey",
                blst::P1,
                1,
                CoordType::Jacobian,
                _jacobian)
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
            result->_jacobian->add(*pk);
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
    BLST_TS_FUNCTION_PREAMBLE
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
        std::unique_ptr<blst::P2> p_sig{nullptr};
        blst::P2 *sig = nullptr;
        try {
            BLST_TS_UNWRAP_POINT_ARG(
                val,
                p_sig,
                sig,
                signature,
                Signature,
                SIGNATURE,
                "Signature",
                blst::P2,
                2,
                CoordType::Jacobian,
                _jacobian)
            result->_jacobian->add(*sig);
        } catch (const blst::BLST_ERROR &err) {
            std::ostringstream msg;
            msg << "BLST_ERROR::" << module->GetBlstErrorString(err)
                << " - Invalid signature at index " << i;
            Napi::Error::New(env, msg.str()).ThrowAsJavaScriptException();
            return env.Undefined();
        }
    }

    return scope.Escape(wrapped);
}

Napi::Value AggregateVerify(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    Napi::EscapableHandleScope scope(env);
    try {
        BlstTsAddon *module = env.GetInstanceData<BlstTsAddon>();

        if (!info[0].IsArray()) {
            Napi::TypeError::New(env, "msgs must be of type BlstBuffer[]")
                .ThrowAsJavaScriptException();
            return scope.Escape(env.Undefined());
        }
        Napi::Array msgs_array = info[0].As<Napi::Array>();
        uint32_t msgs_array_length = msgs_array.Length();

        if (!info[1].IsArray()) {
            Napi::TypeError::New(
                env, "publicKeys must be of type PublicKeyArg[]")
                .ThrowAsJavaScriptException();
            return scope.Escape(env.Undefined());
        }
        Napi::Array pk_array = info[1].As<Napi::Array>();
        uint32_t pk_array_length = pk_array.Length();

        blst::P2_Affine *sig;
        std::unique_ptr<blst::P2_Affine> p_sig{nullptr};
        BLST_TS_UNWRAP_POINT_ARG(
            info[2],
            p_sig,
            sig,
            signature,
            Signature,
            SIGNATURE,
            "Signature",
            blst::P2_Affine,
            2,
            CoordType::Affine,
            _affine)

        if (pk_array_length == 0) {
            if (sig->is_inf()) {
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
            Napi::TypeError::New(
                env, "msgs and publicKeys must be the same length")
                .ThrowAsJavaScriptException();
            return scope.Escape(env.Undefined());
        }

        std::unique_ptr<blst::Pairing> ctx{
            new blst::Pairing(true, module->_dst)};

        for (uint32_t i = 0; i < pk_array_length; i++) {
            Napi::Value msg_value = msgs_array[i];
            BLST_TS_UNWRAP_UINT_8_ARRAY(msg_value, msg, "msg")
            blst::P1_Affine *pk;
            std::unique_ptr<blst::P1_Affine> p_pk{nullptr};
            BLST_TS_UNWRAP_POINT_ARG(
                static_cast<Napi::Value>(pk_array[i]),
                p_pk,
                pk,
                public_key,
                PublicKey,
                PUBLIC_KEY,
                "PublicKey",
                blst::P1_Affine,
                1,
                CoordType::Affine,
                _affine)

            blst::BLST_ERROR err =
                ctx->aggregate(pk, sig, msg.Data(), msg.ByteLength());
            if (err != blst::BLST_ERROR::BLST_SUCCESS) {
                std::ostringstream msg;
                msg << "BLST_ERROR::" << module->GetBlstErrorString(err)
                    << ": Invalid verification aggregate at index " << i;
                Napi::Error::New(env, msg.str()).ThrowAsJavaScriptException();
                return scope.Escape(env.Undefined());
            }
        }

        ctx->commit();
        blst::PT pt{*sig};
        return Napi::Boolean::New(env, ctx->finalverify(&pt));
    } catch (...) {
        return Napi::Boolean::New(env, false);
    }
}

typedef struct {
    blst::P1_Affine *pk;
    blst::P2_Affine *sig;
    uint8_t *msg;
    size_t msg_len;
} SignatureSet;

Napi::Value VerifyMultipleAggregateSignatures(const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    Napi::EscapableHandleScope scope(env);
    try {
        BlstTsAddon *module = env.GetInstanceData<BlstTsAddon>();

        if (!info[0].IsArray()) {
            Napi::TypeError::New(
                env, "signatureSets must be of type SignatureSet[]")
                .ThrowAsJavaScriptException();
            return scope.Escape(env.Undefined());
        }
        Napi::Array sets_array = info[0].As<Napi::Array>();
        uint32_t sets_array_length = sets_array.Length();
        std::unique_ptr<blst::Pairing> ctx{
            new blst::Pairing(true, module->_dst)};

        for (uint32_t i = 0; i < sets_array_length; i++) {
            blst::byte rand[BLST_TS_RANDOM_BYTES_LENGTH];
            module->GetRandomBytes(rand, BLST_TS_RANDOM_BYTES_LENGTH);

            Napi::Value set_value = sets_array[i];
            if (!set_value.IsObject()) {
                Napi::TypeError::New(env, "signatureSet must be an object")
                    .ThrowAsJavaScriptException();
                return scope.Escape(env.Undefined());
            }
            Napi::Object set = set_value.As<Napi::Object>();

            Napi::Value msg_value = set.Get("msg");
            BLST_TS_UNWRAP_UINT_8_ARRAY(msg_value, msg, "msg")

            blst::P1_Affine *pk;
            std::unique_ptr<blst::P1_Affine> p_pk{nullptr};
            BLST_TS_UNWRAP_POINT_ARG(
                static_cast<Napi::Value>(set.Get("publicKey")),
                p_pk,
                pk,
                public_key,
                PublicKey,
                PUBLIC_KEY,
                "PublicKey",
                blst::P1_Affine,
                1,
                CoordType::Affine,
                _affine)

            blst::P2_Affine *sig;
            std::unique_ptr<blst::P2_Affine> p_sig{nullptr};
            BLST_TS_UNWRAP_POINT_ARG(
                static_cast<Napi::Value>(set.Get("signature")),
                p_sig,
                sig,
                signature,
                Signature,
                SIGNATURE,
                "Signature",
                blst::P2_Affine,
                2,
                CoordType::Affine,
                _affine)

            blst::BLST_ERROR err = ctx->mul_n_aggregate(
                pk,
                sig,
                rand,
                BLST_TS_RANDOM_BYTES_LENGTH,
                msg.Data(),
                msg.ByteLength());
            if (err != blst::BLST_ERROR::BLST_SUCCESS) {
                std::ostringstream msg;
                msg << module->GetBlstErrorString(err)
                    << ": Invalid batch aggregation at index " << i;
                Napi::Error::New(env, msg.str()).ThrowAsJavaScriptException();
                return scope.Escape(env.Undefined());
            }
        }
        ctx->commit();
        return Napi::Boolean::New(env, ctx->finalverify());
    } catch (...) {
        return Napi::Boolean::New(env, false);
    }
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