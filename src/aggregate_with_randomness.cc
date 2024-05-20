#include "addon.h"

namespace blst_ts_functions {

typedef struct {
    blst_ts::P1Wrapper *pk;
    uint8_t *sig_data;
    size_t sig_length;
} SignatureAndPublicKeySet;

blst_ts::BLST_TS_ERROR prepare_aggregate_with_randomness(
    std::vector<SignatureAndPublicKeySet> &sets,
    bool &validate,
    const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    Napi::Value array_value = info[0];
    if (!array_value.IsArray()) {
        Napi::TypeError::New(
            env, "Must pass an array to aggregateWithRandomness")
            .ThrowAsJavaScriptException();
        return blst_ts::BLST_TS_ERROR::JS_ERROR_THROWN;
    }
    Napi::Array array = array_value.As<Napi::Array>();
    size_t sets_length = array.Length();
    if (sets_length == 0) {
        Napi::TypeError::New(
            env, "Empty array passed to aggregateWithRandomness")
            .ThrowAsJavaScriptException();
        return blst_ts::BLST_TS_ERROR::JS_ERROR_THROWN;
    }
    sets.resize(sets_length);

    Napi::Value validate_value = info[1];
    if (!validate_value.IsUndefined()) {
        if (!validate_value.IsBoolean()) {
            Napi::TypeError::New(
                env, "Must pass a boolean for validateSerialized")
                .ThrowAsJavaScriptException();
            return blst_ts::BLST_TS_ERROR::JS_ERROR_THROWN;
        }
        validate = validate_value.As<Napi::Boolean>().Value();
    }

    for (uint32_t i = 0; i < sets_length; i++) {
        sets[i] = {nullptr, nullptr, 0};
        Napi::Value set_value = array[i];
        if (!set_value.IsObject()) {
            Napi::TypeError::New(
                env,
                "Must pass an array of objects to "
                "aggregateWithRandomness")
                .ThrowAsJavaScriptException();
            return blst_ts::BLST_TS_ERROR::JS_ERROR_THROWN;
        }
        Napi::Object set = set_value.As<Napi::Object>();

        try {
            blst_ts::PublicKey *to_aggregate = blst_ts::PublicKey::Unwrap(
                set.Get("publicKey").As<Napi::Object>());
            sets[i].pk = to_aggregate->point.get();
        } catch (...) {
            Napi::Error::New(
                env,
                "BLST_ERROR: Invalid PublicKey at index "s + std::to_string(i))
                .ThrowAsJavaScriptException();
            return blst_ts::BLST_TS_ERROR::JS_ERROR_THROWN;
        }

        try {
            Napi::Value val = set.Get("signature");
            Napi::Uint8Array typed_array = val.As<Napi::Uint8Array>();
            sets[i].sig_data = typed_array.Data();
            sets[i].sig_length = typed_array.ByteLength();
        } catch (...) {
            Napi::Error::New(
                env,
                "BLST_ERROR: Invalid Signature at index "s + std::to_string(i))
                .ThrowAsJavaScriptException();
            return blst_ts::BLST_TS_ERROR::JS_ERROR_THROWN;
        }
    }

    return blst_ts::BLST_TS_ERROR::SUCCESS;
}

blst_ts::BLST_TS_ERROR aggregate_with_randomness(
    blst::P1 &aggregate_key,
    blst::P2 &aggregate_sig,
    std::string &error_msg,
    BlstTsAddon *module,
    const std::vector<SignatureAndPublicKeySet> &sets,
    const bool &validate) {
    for (uint32_t i = 0; i < sets.size(); i++) {
        blst::byte randomness[BLST_TS_RANDOM_BYTES_LENGTH];
        if (!module->GetRandomNonZeroBytes(
                randomness, BLST_TS_RANDOM_BYTES_LENGTH)) {
            error_msg = "BLST_ERROR: Failed to generate random bytes";
            return blst_ts::BLST_TS_ERROR::HAS_NATIVE_ERROR;
        }

        aggregate_key.add(
            sets[i].pk->MultiplyBy(randomness, BLST_TS_RANDOM_BYTES_LENGTH));

        blst::P2 sig;
        try {
            sig = blst::P2{sets[i].sig_data, sets[i].sig_length};
        } catch (...) {
            error_msg =
                "BLST_ERROR: Invalid Signature at index "s + std::to_string(i);
            return blst_ts::BLST_TS_ERROR::HAS_NATIVE_ERROR;
        }

        if (validate && (!sig.in_group() || sig.is_inf())) {
            error_msg =
                "BLST_ERROR: Invalid Signature at index "s + std::to_string(i);
            return blst_ts::BLST_TS_ERROR::HAS_NATIVE_ERROR;
        }

        sig.mult(randomness, BLST_TS_RANDOM_BYTES_LENGTH * 8);
        aggregate_sig.add(sig);
    }

    return blst_ts::BLST_TS_ERROR::SUCCESS;
}

Napi::Value AggregateWithRandomness(const Napi::CallbackInfo &info) {
    BLST_TS_FUNCTION_PREAMBLE(info, env, module)
    std::vector<SignatureAndPublicKeySet> sets{};
    bool validate{true};

    blst_ts::BLST_TS_ERROR err =
        prepare_aggregate_with_randomness(sets, validate, info);
    if (err == blst_ts::BLST_TS_ERROR::JS_ERROR_THROWN) {
        return scope.Escape(env.Undefined());
    }

    blst::P1 aggregate_key{};
    blst::P2 aggregate_sig{};
    std::string error_msg{};
    err = aggregate_with_randomness(
        aggregate_key, aggregate_sig, error_msg, module, sets, validate);
    if (err == blst_ts::BLST_TS_ERROR::HAS_NATIVE_ERROR) {
        Napi::Error::New(env, error_msg).ThrowAsJavaScriptException();
        return scope.Escape(env.Undefined());
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

class AggregateWithRandomnessWorker : public Napi::AsyncWorker {
   public:
    AggregateWithRandomnessWorker(
        const Napi::CallbackInfo &info,
        BlstTsAddon *module,
        std::vector<SignatureAndPublicKeySet> sets,
        bool validate)
        : Napi::AsyncWorker{info.Env(), "AggregateWithRandomnessWorker"},
          deferred{Env()},
          _module{std::move(module)},
          _sets_ref{Napi::Persistent(info[0])},
          _sets{std::move(sets)},
          _validate{std::move(validate)} {}

    /**
     * GetPromise associated with deferred for return to JS
     */
    Napi::Promise GetPromise() { return deferred.Promise(); }

   protected:
    void Execute() {
        std::string error_msg{};
        blst_ts::BLST_TS_ERROR err = aggregate_with_randomness(
            _aggregate_key,
            _aggregate_sig,
            error_msg,
            _module,
            _sets,
            _validate);
        if (err == blst_ts::BLST_TS_ERROR::HAS_NATIVE_ERROR) {
            SetError(error_msg);
        }
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

   private:
    BlstTsAddon *_module;
    Napi::Reference<Napi::Value> _sets_ref;
    std::vector<SignatureAndPublicKeySet> _sets;
    bool _validate;
    blst::P1 _aggregate_key;
    blst::P2 _aggregate_sig;
};

Napi::Value AsyncAggregateWithRandomness(const Napi::CallbackInfo &info) {
    BLST_TS_FUNCTION_PREAMBLE(info, env, module)
    std::vector<SignatureAndPublicKeySet> sets{};
    bool validate{true};

    blst_ts::BLST_TS_ERROR err =
        prepare_aggregate_with_randomness(sets, validate, info);
    if (err == blst_ts::BLST_TS_ERROR::JS_ERROR_THROWN) {
        return env.Undefined();
    }

    AggregateWithRandomnessWorker *worker =
        new AggregateWithRandomnessWorker(info, module, sets, validate);
    worker->Queue();
    return worker->GetPromise();
}
}  // namespace blst_ts_functions
