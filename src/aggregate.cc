#include "addon.h"

namespace blst_ts_functions {
Napi::Value AggregatePublicKeys(const Napi::CallbackInfo &info) {
    BLST_TS_FUNCTION_PREAMBLE(info, env, module)
    if (!info[0].IsArray()) {
        Napi::TypeError::New(
            env, "BLST_ERROR: publicKeys must be of type PublicKeyArg[]")
            .ThrowAsJavaScriptException();
        return env.Undefined();
    }
    Napi::Array arr = info[0].As<Napi::Array>();
    uint32_t length = arr.Length();
    if (length == 0) {
        Napi::TypeError::New(
            env, "BLST_ERROR: PublicKeyArg[] must have length > 0")
            .ThrowAsJavaScriptException();
        return env.Undefined();
    }

    blst::P1 aggregate{};
    bool has_error = false;
    for (uint32_t i = 0; i < length; i++) {
        Napi::Value val = arr[i];
        try {
            if (val.IsTypedArray()) {
                Napi::Uint8Array typed_array = val.As<Napi::Uint8Array>();
                if (std::optional<std::string> err_msg =
                        blst_ts::is_valid_length(
                            typed_array.ByteLength(),
                            blst_ts::public_key_length_compressed,
                            blst_ts::public_key_length_uncompressed)) {
                    Napi::TypeError::New(
                        env, "BLST_ERROR: PublicKeyArg"s + *err_msg)
                        .ThrowAsJavaScriptException();
                    has_error = true;
                } else {
                    blst::P1 point{
                        typed_array.Data(), typed_array.ByteLength()};
                    if (point.is_inf()) {
                        Napi::TypeError::New(
                            env,
                            "BLST_ERROR: PublicKeyArg must not be zero key")
                            .ThrowAsJavaScriptException();
                        has_error = true;
                    }
                    aggregate.add(point);
                }
            } else {
                blst_ts::PublicKey *to_aggregate =
                    blst_ts::PublicKey::Unwrap(val.As<Napi::Object>());
                if (to_aggregate->point->IsInfinite()) {
                    Napi::TypeError::New(
                        env, "BLST_ERROR: PublicKeyArg must not be zero key")
                        .ThrowAsJavaScriptException();
                    has_error = true;
                }
                to_aggregate->point->AddTo(aggregate);
            }
            if (has_error) {
                return env.Undefined();
            }
        } catch (const blst::BLST_ERROR &err) {
            Napi::Error::New(
                env,
                "BLST_ERROR::"s + module->GetBlstErrorString(err) +
                    ": Invalid key at index "s + std::to_string(i))
                .ThrowAsJavaScriptException();
            return env.Undefined();
        } catch (...) {
            Napi::Error::New(
                env,
                "BLST_ERROR: Invalid PublicKeyArg at index "s +
                    std::to_string(i))
                .ThrowAsJavaScriptException();
            return env.Undefined();
        }
    }

    return scope.Escape(
        module->public_key_ctr.New({Napi::External<blst_ts::P1Wrapper>::New(
            env, new blst_ts::P1{std::move(aggregate)})}));
}

Napi::Value AggregateSignatures(const Napi::CallbackInfo &info) {
    BLST_TS_FUNCTION_PREAMBLE(info, env, module)
    if (!info[0].IsArray()) {
        Napi::TypeError::New(
            env, "BLST_ERROR: signatures must be of type SignatureArg[]")
            .ThrowAsJavaScriptException();
        return env.Undefined();
    }
    Napi::Array arr = info[0].As<Napi::Array>();
    uint32_t length = arr.Length();
    if (length == 0) {
        Napi::TypeError::New(
            env, "BLST_ERROR: SignatureArg[] must have length > 0")
            .ThrowAsJavaScriptException();
        return env.Undefined();
    }

    blst::P2 aggregate{};
    bool has_error = false;
    for (uint32_t i = 0; i < length; i++) {
        Napi::Value val = arr[i];
        try {
            if (val.IsTypedArray()) {
                Napi::Uint8Array typed_array = val.As<Napi::Uint8Array>();
                if (std::optional<std::string> err_msg =
                        blst_ts::is_valid_length(
                            typed_array.ByteLength(),
                            blst_ts::signature_length_compressed,
                            blst_ts::signature_length_uncompressed)) {
                    Napi::TypeError::New(
                        env, "BLST_ERROR: SignatureArg"s + *err_msg)
                        .ThrowAsJavaScriptException();
                    has_error = true;
                } else {
                    aggregate.add(
                        blst::P2{typed_array.Data(), typed_array.ByteLength()});
                }
            } else {
                blst_ts::Signature *to_aggregate =
                    blst_ts::Signature::Unwrap(val.As<Napi::Object>());
                to_aggregate->point->AddTo(aggregate);
            }
            if (has_error) {
                return env.Undefined();
            }
        } catch (const blst::BLST_ERROR &err) {
            Napi::Error::New(
                env,
                module->GetBlstErrorString(err) +
                    " - Invalid signature at index "s + std::to_string(i))
                .ThrowAsJavaScriptException();
            return env.Undefined();
        } catch (...) {
            Napi::Error::New(
                env,
                "BLST_ERROR - Invalid SignatureArg at index "s +
                    std::to_string(i))
                .ThrowAsJavaScriptException();
            return env.Undefined();
        }
    }

    return scope.Escape(
        module->signature_ctr.New({Napi::External<blst_ts::P2Wrapper>::New(
            env, new blst_ts::P2{std::move(aggregate)})}));
}
}  // namespace blst_ts_functions
