#pragma once
#include "addon.h"

namespace {
Napi::Value AggregateWithRandomness(const Napi::CallbackInfo &info) {
    BLST_TS_FUNCTION_PREAMBLE(info, env, module)
    Napi::Value array_value = info[0];
    if (!array_value.IsArray()) {
        Napi::TypeError::New(
            env, "Must pass an array to aggregateWithRandomness")
            .ThrowAsJavaScriptException();
        return env.Undefined();
    }
    Napi::Array array = array_value.As<Napi::Array>();
    uint32_t array_length = array.Length();
    if (array_length == 0) {
        Napi::TypeError::New(
            env, "Empty array passed to aggregateWithRandomness")
            .ThrowAsJavaScriptException();
        return env.Undefined();
    }

    bool validate = true;
    Napi::Value validate_value = info[1];
    if (!validate_value.IsUndefined()) {
        if (!validate_value.IsBoolean()) {
            Napi::TypeError::New(
                env, "Must pass a boolean for validateSerialized")
                .ThrowAsJavaScriptException();
            return env.Undefined();
        }
        validate = validate_value.As<Napi::Boolean>().Value();
    }

    blst::P1 aggregate_key{};
    blst::P2 aggregate_sig{};

    for (uint32_t i = 0; i < array_length; i++) {
        blst::byte randomness[BLST_TS_RANDOM_BYTES_LENGTH];
        module->GetRandomNonZeroBytes(randomness, BLST_TS_RANDOM_BYTES_LENGTH);
        Napi::Value set_value = array[i];
        if (!set_value.IsObject()) {
            Napi::TypeError::New(
                env, "Must pass an array of objects to aggregateWithRandomness")
                .ThrowAsJavaScriptException();
            return env.Undefined();
        }
        Napi::Object set = set_value.As<Napi::Object>();

        try {
            Napi::Value val = set.Get("publicKey");
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
                    return env.Undefined();
                } else if (blst_ts::is_zero_bytes(
                               typed_array.Data(),
                               0,
                               typed_array.ByteLength())) {
                    Napi::TypeError::New(
                        env, "BLST_ERROR: PublicKeyArg must not be zero key")
                        .ThrowAsJavaScriptException();
                    return env.Undefined();
                } else {
                    blst::P1 key{typed_array.Data(), typed_array.ByteLength()};
                    if (validate && (key.is_inf() || !key.in_group())) {
                        Napi::Error::New(
                            env,
                            "BLST_ERROR: Invalid key at index "s +
                                std::to_string(i))
                            .ThrowAsJavaScriptException();
                        return env.Undefined();
                    }
                    key.mult(randomness, BLST_TS_RANDOM_BYTES_LENGTH);
                    aggregate_key.add(key);
                }
            } else {
                blst_ts::PublicKey *to_aggregate =
                    blst_ts::PublicKey::Unwrap(val.As<Napi::Object>());
                blst::P1 key = to_aggregate->point->MultiplyBy(
                    randomness, BLST_TS_RANDOM_BYTES_LENGTH);
                aggregate_key.add(key);
            }
        } catch (const blst::BLST_ERROR &err) {
            Napi::Error::New(
                env,
                module->GetBlstErrorString(err) + ": Invalid key at index "s +
                    std::to_string(i))
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

        try {
            Napi::Value val = set.Get("signature");
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
                    return env.Undefined();
                } else if (blst_ts::is_zero_bytes(
                               typed_array.Data(),
                               0,
                               typed_array.ByteLength())) {
                    Napi::TypeError::New(
                        env,
                        "BLST_ERROR: SignatureArg must not be zero signature")
                        .ThrowAsJavaScriptException();
                    return env.Undefined();
                } else {
                    blst::P2 sig{typed_array.Data(), typed_array.ByteLength()};
                    if (validate && !sig.in_group()) {
                        Napi::Error::New(
                            env,
                            "BLST_ERROR: Invalid signature at index "s +
                                std::to_string(i))
                            .ThrowAsJavaScriptException();
                        return env.Undefined();
                    }
                    sig.mult(randomness, BLST_TS_RANDOM_BYTES_LENGTH);
                    aggregate_sig.add(sig);
                }
            } else {
                blst_ts::Signature *to_aggregate =
                    blst_ts::Signature::Unwrap(val.As<Napi::Object>());
                blst::P2 sig = to_aggregate->point->MultiplyBy(
                    randomness, BLST_TS_RANDOM_BYTES_LENGTH);
                aggregate_sig.add(sig);
            }
        } catch (const blst::BLST_ERROR &err) {
            Napi::Error::New(
                env,
                module->GetBlstErrorString(err) +
                    ": Invalid signature at index "s + std::to_string(i))
                .ThrowAsJavaScriptException();
            return env.Undefined();
        } catch (...) {
            Napi::Error::New(
                env,
                "BLST_ERROR: Invalid SignatureArg at index "s +
                    std::to_string(i))
                .ThrowAsJavaScriptException();
            return env.Undefined();
        }
    }

    Napi::Object ret_val = Napi::Object::New(env);
    ret_val.Set(
        Napi::String::New(env, "publicKey"),
        module->public_key_ctr.New({Napi::External<blst_ts::P1Wrapper>::New(
            env, new blst_ts::P1{std::move(aggregate_key)})}));
    ret_val.Set(
        Napi::String::New(env, "signature"),
        module->signature_ctr.New({Napi::External<blst_ts::P2Wrapper>::New(
            env, new blst_ts::P2{std::move(aggregate_sig)})}));
    return scope.Escape(ret_val);
}
}  // anonymous namespace
