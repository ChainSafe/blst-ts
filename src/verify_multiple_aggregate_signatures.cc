#include "functions.h"

namespace blst_ts_functions {
typedef struct {
    blst_ts::P1AffineGroup pk_point;
    blst_ts::P2AffineGroup sig_point;
    uint8_t *msg;
    size_t msg_len;
} SignatureSet;

/**
 * Preparation phase for multiple aggregate verification. Handles incoming JS
 * arguments and prepares them for use by the native layer. Must be run on JS
 * thread!
 * 
 * @param[out] sets - Sets to be added to pairing
 * @param[in]  info - JS function context
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

        blst_ts::BLST_TS_ERROR err =
            unwrap_public_key(sets[i].pk_point, env, set.Get("publicKey"));
        if (err != blst_ts::BLST_TS_ERROR::SUCCESS) {
            return err;
        }

        err = unwrap_signature(sets[i].sig_point, env, set.Get("signature"));
        if (err != blst_ts::BLST_TS_ERROR::SUCCESS) {
            return err;
        }
    }

    return blst_ts::BLST_TS_ERROR::SUCCESS;
}

/**
 * Aggregate verify multiple signatures. Consumes SignatureSets created in
 * preparation phase. Safe to use in libuv thread.
 * 
 * @param[out] result    - Result of the verification
 * @param[out] error_msg - Error message for invalid aggregate
 * @param[in]  module    - Addon module
 * @param[in]  ctx       - Pointer to paring for the verification
 * @param[in]  sets      - Sets to be added to pairing
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
            return blst_ts::BLST_TS_ERROR::INVALID;
        }
    }
    ctx->commit();
    result = ctx->finalverify();
    return blst_ts::BLST_TS_ERROR::SUCCESS;
}

/**
 * Synchronous multiple aggregate verification. Implementation is handled the
 * functions above (prepare_verify_multiple_aggregate_signatures and 
 * verify_multiple_aggregate_signatures)
 */
Napi::Value VerifyMultipleAggregateSignatures(const Napi::CallbackInfo &info) {
    BLST_TS_FUNCTION_PREAMBLE(info, env, module)
    try {
        bool result{false};
        std::string error_msg{};
        std::vector<SignatureSet> sets{};
        blst_ts::BLST_TS_ERROR error =
            prepare_verify_multiple_aggregate_signatures(sets, info);
        if (error == blst_ts::BLST_TS_ERROR::SUCCESS) {
            std::unique_ptr<blst::Pairing> ctx =
                std::make_unique<blst::Pairing>(true, module->dst);
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
    VerifyMultipleAggregateSignaturesWorker(
        const Napi::CallbackInfo &info,
        BlstTsAddon *module,
        std::vector<SignatureSet> sets)
        : Napi::
              AsyncWorker{info.Env(), "VerifyMultipleAggregateSignaturesWorker"},
          deferred{Env()},
          _module{std::move(module)},
          _ctx{std::make_unique<blst::Pairing>(true, _module->dst)},
          _sets{std::move(sets)},
          _sets_ref{Napi::Persistent(info[0])},
          _result{false} {}

    /**
     * GetPromise associated with deferred for return to JS
     */
    Napi::Promise GetPromise() { return deferred.Promise(); }

   protected:
    void Execute() {
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

   private:
    BlstTsAddon *_module;
    std::unique_ptr<blst::Pairing> _ctx;
    std::vector<SignatureSet> _sets;
    Napi::Reference<Napi::Value> _sets_ref;
    bool _result;
};

/**
 * Asynchronous multiple aggregate verification. Implementation is handled the
 * functions above (prepare_verify_multiple_aggregate_signatures and
 * verify_multiple_aggregate_signatures)
 */
Napi::Value AsyncVerifyMultipleAggregateSignatures(
    const Napi::CallbackInfo &info) {
    BLST_TS_FUNCTION_PREAMBLE(info, env, module)
    std::vector<SignatureSet> sets{};
    blst_ts::BLST_TS_ERROR error;
    try {
        error = prepare_verify_multiple_aggregate_signatures(sets, info);
    } catch (...) {
        error = blst_ts::BLST_TS_ERROR::INVALID;
    }
    switch (error) {
        case blst_ts::BLST_TS_ERROR::SUCCESS:
            break;
        case blst_ts::BLST_TS_ERROR::JS_ERROR_THROWN:
            return info.Env().Undefined();
        default:
        case blst_ts::BLST_TS_ERROR::INVALID:
            Napi::Promise::Deferred deferred{env};
            deferred.Resolve(Napi::Boolean::New(env, false));
            return deferred.Promise();
    }

    // gets deleted by Node after async work completes
    VerifyMultipleAggregateSignaturesWorker *worker =
        new VerifyMultipleAggregateSignaturesWorker(
            info, module, std::move(sets));
    worker->Queue();
    return worker->GetPromise();
}
}  // namespace blst_ts_functions
