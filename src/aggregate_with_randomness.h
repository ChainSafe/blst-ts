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
        if (!module->GetRandomNonZeroBytes(
                randomness, BLST_TS_RANDOM_BYTES_LENGTH)) {
            Napi::TypeError::New(
                env, "BLST_ERROR: Failed to generate random bytes")
                .ThrowAsJavaScriptException();
            return env.Undefined();
        }

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

typedef struct {
    blst_ts::P1Wrapper *pk;
    uint8_t *sig_data;
    size_t sig_length;
} SignatureData;

class AggregateWithRandomnessWorker : public Napi::AsyncWorker {
   public:
    AggregateWithRandomnessWorker(const Napi::CallbackInfo &info)
        : Napi::AsyncWorker{info.Env(), "AggregateWithRandomnessWorker"},
          deferred{Env()},
          has_error{false},
          _module{Env().GetInstanceData<BlstTsAddon>()},
          _sets_ref{Napi::Persistent(info[0])},
          _sets{},
          _validate{true} {
        Napi::Env env = Env();
        Napi::Value array_value = info[0];
        if (!array_value.IsArray()) {
            Napi::TypeError::New(
                env, "Must pass an array to asyncAggregateWithRandomness")
                .ThrowAsJavaScriptException();
            has_error = true;
            return;
        }
        Napi::Array array = array_value.As<Napi::Array>();
        uint32_t array_length = array.Length();
        if (array_length == 0) {
            Napi::TypeError::New(
                env, "Empty array passed to asyncAggregateWithRandomness")
                .ThrowAsJavaScriptException();
            has_error = true;
            return;
        }
        _sets.resize(array_length);

        Napi::Value validate_value = info[1];
        if (!validate_value.IsUndefined()) {
            if (!validate_value.IsBoolean()) {
                Napi::TypeError::New(
                    env, "Must pass a boolean for validateSerialized")
                    .ThrowAsJavaScriptException();
                has_error = true;
                return;
            }
            _validate = validate_value.As<Napi::Boolean>().Value();
        }

        for (uint32_t i = 0; i < array_length; i++) {
            _sets.push_back({});
            Napi::Value set_value = array[i];
            if (!set_value.IsObject()) {
                Napi::TypeError::New(
                    env,
                    "Must pass an array of objects to "
                    "asyncAggregateWithRandomness")
                    .ThrowAsJavaScriptException();
                has_error = true;
                return;
            }
            Napi::Object set = set_value.As<Napi::Object>();

            try {
                blst_ts::PublicKey *to_aggregate = blst_ts::PublicKey::Unwrap(
                    set.Get("publicKey").As<Napi::Object>());
                _sets[i].pk = to_aggregate->point.get();
            } catch (...) {
                Napi::Error::New(
                    env,
                    "BLST_ERROR: Invalid PublicKeyArg at index "s +
                        std::to_string(i))
                    .ThrowAsJavaScriptException();
                has_error = true;
                return;
            }

            try {
                Napi::Value val = set.Get("signature");
                if (!val.IsTypedArray()) {
                    Napi::Error::New(
                        env,
                        "BLST_ERROR: Signature at index "s + std::to_string(i) +
                            " must be a BlstBuffer"s)
                        .ThrowAsJavaScriptException();
                    has_error = true;
                    return;
                }
                Napi::Uint8Array typed_array = val.As<Napi::Uint8Array>();
                if (std::optional<std::string> err_msg =
                        blst_ts::is_valid_length(
                            typed_array.ByteLength(),
                            blst_ts::signature_length_compressed,
                            blst_ts::signature_length_uncompressed)) {
                    Napi::TypeError::New(
                        env, "BLST_ERROR: SignatureArg "s + *err_msg)
                        .ThrowAsJavaScriptException();
                    has_error = true;
                    return;
                }

                _sets[i].sig_data = typed_array.Data();
                _sets[i].sig_length = typed_array.ByteLength();
            } catch (...) {
                Napi::Error::New(
                    env,
                    "BLST_ERROR: Invalid Signature at index "s +
                        std::to_string(i))
                    .ThrowAsJavaScriptException();
                has_error = true;
                return;
            }
        }
    }

    /**
     * GetPromise associated with deferred for return to JS
     */
    Napi::Promise GetPromise() { return deferred.Promise(); }

   protected:
    void Execute() {
        for (uint32_t i = 0; i < _sets.size(); i++) {
            blst::byte randomness[BLST_TS_RANDOM_BYTES_LENGTH];
            if (!_module->GetRandomNonZeroBytes(
                    randomness, BLST_TS_RANDOM_BYTES_LENGTH)) {
                SetError("BLST_ERROR: Failed to generate random bytes");
                return;
            }

            _aggregate_key.add(_sets[i].pk->MultiplyBy(
                randomness, BLST_TS_RANDOM_BYTES_LENGTH));

            blst::P2 sig{_sets[i].sig_data, _sets[i].sig_length};
            if (_validate && !sig.in_group()) {
                SetError(
                    "BLST_ERROR: Invalid signature at index "s +
                    std::to_string(i));
                return;
            }
            sig.mult(randomness, BLST_TS_RANDOM_BYTES_LENGTH);
            _aggregate_sig.add(sig);
        }
        SetError("Got to Here!!!");
        return;
    }
    void OnOK() {
        Napi::Env env = Env();
        Napi::Object ret_val = Napi::Object::New(env);
        ret_val["publicKey"] = _module->public_key_ctr.New(
            {Napi::External<blst_ts::P1Wrapper>::New(
                env, new blst_ts::P1{std::move(_aggregate_key)})});
        ret_val["signature"] =
            _module->signature_ctr.New({Napi::External<blst_ts::P2Wrapper>::New(
                env, new blst_ts::P2{std::move(_aggregate_sig)})});
        deferred.Resolve(ret_val);
    }
    void OnError(const Napi::Error &err) { deferred.Reject(err.Value()); }

   public:
    Napi::Promise::Deferred deferred;
    bool has_error;

   private:
    BlstTsAddon *_module;
    Napi::Reference<Napi::Value> _sets_ref;
    std::vector<SignatureData> _sets;
    bool _validate;
    blst::P1 _aggregate_key;
    blst::P2 _aggregate_sig;
};

Napi::Value AsyncAggregateWithRandomness(const Napi::CallbackInfo &info) {
    AggregateWithRandomnessWorker *worker =
        new AggregateWithRandomnessWorker(info);
    if (worker->has_error) {
        delete worker;
        return info.Env().Undefined();
    }
    worker->Queue();
    return worker->GetPromise();
}
}  // anonymous namespace
