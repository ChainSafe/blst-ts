#include "addon.h"

namespace {
typedef struct {
    blst_ts::P1AffineGroup pk_point;
    blst_ts::P2AffineGroup sig_point;
    uint8_t *msg;
    size_t msg_len;
} SignatureSet;


/**
 * @param[out]  {std::vector<SignatureSet>} - Sets to be added to pairing
 * @param[in]   {Napi::CallbackInfo} - JS function context
 */
blst_ts::BLST_TS_ERROR prepare_verify_multiple_aggregate_signatures(
    std::vector<SignatureSet> &sets, const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    if (!info[0].IsArray()) {
        Napi::Error::New(
            env, "BLST_ERROR: signatureSets must be of type SignatureSet[]")
            .ThrowAsJavaScriptException();
        return blst_ts::BLST_TS_ERROR::JS_ERROR_THROWN;
    }
    Napi::Array sets_array = info[0].As<Napi::Array>();
    uint32_t sets_array_length = sets_array.Length();

    sets.reserve(sets_array_length);

    for (uint32_t i = 0; i < sets_array_length; i++) {
        Napi::Value set_value = sets_array[i];
        if (!set_value.IsObject()) {
            Napi::Error::New(env, "BLST_ERROR: signatureSet must be an object")
                .ThrowAsJavaScriptException();
            return blst_ts::BLST_TS_ERROR::JS_ERROR_THROWN;
        }
        Napi::Object set = set_value.As<Napi::Object>();

        Napi::Value msg_value = set.Get("message");
        BLST_TS_FUNCTION_UNWRAP_UINT_8_ARRAY(msg_value, msg, "message")

        sets.push_back(
            {blst_ts::P1AffineGroup{},
             blst_ts::P2AffineGroup{},
             msg.Data(),
             msg.ByteLength()});

        Napi::Value pk_val = set.Get("publicKey");
        if (pk_val.IsTypedArray()) {
            Napi::Uint8Array typed_array = pk_val.As<Napi::Uint8Array>();
            if (std::optional<std::string> err_msg = blst_ts::is_valid_length(
                    typed_array.ByteLength(),
                    blst_ts::public_key_length_compressed,
                    blst_ts::public_key_length_uncompressed)) {
                Napi::TypeError::New(
                    env, "BLST_ERROR: PublicKeyArg"s + *err_msg)
                    .ThrowAsJavaScriptException();
                return blst_ts::BLST_TS_ERROR::JS_ERROR_THROWN;
            } else if (blst_ts::is_zero_bytes(
                           typed_array.Data(), 0, typed_array.ByteLength())) {
                Napi::TypeError::New(
                    env, "BLST_ERROR: PublicKeyArg must not be zero key")
                    .ThrowAsJavaScriptException();
                return blst_ts::BLST_TS_ERROR::JS_ERROR_THROWN;
            } else {
                sets[i].pk_point.smart_pointer =
                    std::make_unique<blst::P1_Affine>(
                        typed_array.Data(), typed_array.ByteLength());
                sets[i].pk_point.raw_point =
                    sets[i].pk_point.smart_pointer.get();
            }
        } else {
            blst_ts::PublicKey *to_verify =
                blst_ts::PublicKey::Unwrap(pk_val.As<Napi::Object>());
            sets[i].pk_point = to_verify->point->AsAffine();
        }

        Napi::Value sig_val = set.Get("signature");
        if (sig_val.IsTypedArray()) {
            Napi::Uint8Array typed_array = sig_val.As<Napi::Uint8Array>();
            if (std::optional<std::string> err_msg = blst_ts::is_valid_length(
                    typed_array.ByteLength(),
                    blst_ts::signature_length_compressed,
                    blst_ts::signature_length_uncompressed)) {
                Napi::TypeError::New(
                    env, "BLST_ERROR: SignatureArg"s + *err_msg)
                    .ThrowAsJavaScriptException();
                return blst_ts::BLST_TS_ERROR::JS_ERROR_THROWN;
            } else {
                sets[i].sig_point.smart_pointer =
                    std::make_unique<blst::P2_Affine>(
                        typed_array.Data(), typed_array.ByteLength());
                sets[i].sig_point.raw_point =
                    sets[i].sig_point.smart_pointer.get();
            }
        } else {
            blst_ts::Signature *to_verify =
                blst_ts::Signature::Unwrap(sig_val.As<Napi::Object>());
            sets[i].sig_point = to_verify->point->AsAffine();
        }
    }

    return blst_ts::BLST_TS_ERROR::SUCCESS;
}

/**
 * @param[out]  {boolean} - Result of the verification
 * @param[out]  {std::string} - Error message for invalid aggregate
 * @param[in]   {BlstTsAddon *} - Addon module
 * @param[in]   {blst::Paring *} - Pointer to paring for the verification
 * @param[in]   {std::vector<SignatureSet>} - Sets to be added to pairing
 */
blst_ts::BLST_TS_ERROR verify_multiple_aggregate_signatures(
    bool &result,
    std::string &error_msg,
    BlstTsAddon *module,
    std::unique_ptr<blst::Pairing> &ctx,
    std::vector<SignatureSet> &sets) {
    for (uint32_t i = 0; i < sets.size(); i++) {
        blst::byte rand[BLST_TS_RANDOM_BYTES_LENGTH];
        if (!module->GetRandomNonZeroBytes(rand, BLST_TS_RANDOM_BYTES_LENGTH)) {
            error_msg = "BLST_ERROR: Failed to generate random bytes";
            return blst_ts::BLST_TS_ERROR::HAS_NATIVE_ERROR;
        }

        blst::BLST_ERROR err = ctx->mul_n_aggregate(
            sets[i].pk_point.raw_point,
            sets[i].sig_point.raw_point,
            rand,
            BLST_TS_RANDOM_BYTES_LENGTH * 8,
            sets[i].msg,
            sets[i].msg_len);
        if (err != blst::BLST_ERROR::BLST_SUCCESS) {
            error_msg = module->GetBlstErrorString(err) +
                        ": Invalid batch aggregation at index "s +
                        std::to_string(i);
            return blst_ts::BLST_TS_ERROR::HAS_NATIVE_ERROR;
        }
    }
    ctx->commit();
    result = ctx->finalverify();
    return blst_ts::BLST_TS_ERROR::SUCCESS;
}

Napi::Value VerifyMultipleAggregateSignatures(const Napi::CallbackInfo &info) {
    BLST_TS_FUNCTION_PREAMBLE(info, env, module)
    try {
        bool result{false};
        std::string error_msg{};
        std::vector<SignatureSet> sets{};
        blst_ts::BLST_TS_ERROR error =
            prepare_verify_multiple_aggregate_signatures(sets, info);
        if (error == blst_ts::BLST_TS_ERROR::SUCCESS) {
            std::unique_ptr<blst::Pairing> ctx{
                new blst::Pairing(true, module->dst)};
            error = verify_multiple_aggregate_signatures(
                result, error_msg, module, ctx, sets);
        }
        switch (error) {
            case blst_ts::BLST_TS_ERROR::SUCCESS:
                return scope.Escape(Napi::Boolean::New(env, result));
            case blst_ts::BLST_TS_ERROR::JS_ERROR_THROWN:
                return scope.Escape(env.Undefined());
            case blst_ts::BLST_TS_ERROR::HAS_NATIVE_ERROR:
                Napi::Error::New(env, error_msg).ThrowAsJavaScriptException();
                return scope.Escape(env.Undefined());
            default:
            case blst_ts::BLST_TS_ERROR::INVALID:
                return scope.Escape(Napi::Boolean::New(env, false));
        }
    } catch (...) {
        return Napi::Boolean::New(env, false);
    }
}

class VerifyMultipleAggregateSignaturesWorker : public Napi::AsyncWorker {
   public:
    VerifyMultipleAggregateSignaturesWorker(const Napi::CallbackInfo &info)
        : Napi::
              AsyncWorker{info.Env(), "VerifyMultipleAggregateSignaturesWorker"},
          deferred{Env()},
          has_error{false},
          _module{Env().GetInstanceData<BlstTsAddon>()},
          _ctx{new blst::Pairing(true, _module->dst)},
          _sets{},
          _sets_ref{Napi::Persistent(info[0])},
          _is_invalid{false},
          _result{false} {
        try {
            blst_ts::BLST_TS_ERROR error =
                prepare_verify_multiple_aggregate_signatures(_sets, info);
            switch (error) {
                case blst_ts::BLST_TS_ERROR::SUCCESS:
                    return;
                case blst_ts::BLST_TS_ERROR::JS_ERROR_THROWN:
                    has_error = true;
                    return;
                default:
                case blst_ts::BLST_TS_ERROR::INVALID:
                    _is_invalid = true;
            }
        } catch (...) {
            _is_invalid = true;
        }
    }

    /**
     * GetPromise associated with deferred for return to JS
     */
    Napi::Promise GetPromise() { return deferred.Promise(); }

   protected:
    void Execute() {
        if (_is_invalid) {
            return;
        }
        std::string error_msg{};
        blst_ts::BLST_TS_ERROR error = verify_multiple_aggregate_signatures(
            _result, error_msg, _module, _ctx, _sets);
        if (error == blst_ts::BLST_TS_ERROR::HAS_NATIVE_ERROR) {
            SetError(error_msg);
        }
    }
    void OnOK() { deferred.Resolve(Napi::Boolean::New(Env(), _result)); }
    void OnError(const Napi::Error &err) { deferred.Reject(err.Value()); }

   public:
    Napi::Promise::Deferred deferred;
    bool has_error;

   private:
    BlstTsAddon *_module;
    std::unique_ptr<blst::Pairing> _ctx;
    std::vector<SignatureSet> _sets;
    Napi::Reference<Napi::Value> _sets_ref;
    bool _is_invalid;
    bool _result;
};

Napi::Value AsyncVerifyMultipleAggregateSignatures(
    const Napi::CallbackInfo &info) {
    VerifyMultipleAggregateSignaturesWorker *worker =
        new VerifyMultipleAggregateSignaturesWorker(info);
    if (worker->has_error) {
        delete worker;
        return info.Env().Undefined();
    }
    worker->Queue();
    return worker->GetPromise();
}

}  // namespace
