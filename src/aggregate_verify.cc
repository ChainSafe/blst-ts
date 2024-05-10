#include "functions-inl.h"

namespace blst_ts_functions {
typedef struct {
    blst_ts::P1AffineGroup pk_point;
    uint8_t *msg;
    size_t msg_len;
} AggregateVerifySet;

/**
 * @param[out] sig_point - P2 point for verification
 * @param[out] sets      - Sets to be added to pairing
 * @param[in]  info      - JS function context
 */
blst_ts::BLST_TS_ERROR prepare_aggregate_verify(
    blst_ts::P2AffineGroup &sig_point,
    std::vector<AggregateVerifySet> &sets,
    const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    blst_ts::BLST_TS_ERROR err = unwrap_signature(sig_point, env, info[2]);
    if (err != blst_ts::BLST_TS_ERROR::SUCCESS) {
        return err;
    }

    if (!info[0].IsArray()) {
        Napi::TypeError::New(
            env, "BLST_ERROR: msgs must be of type BlstBuffer[]")
            .ThrowAsJavaScriptException();
        return blst_ts::BLST_TS_ERROR::JS_ERROR_THROWN;
    }
    Napi::Array msgs_array = info[0].As<Napi::Array>();
    uint32_t msgs_array_length = msgs_array.Length();
    if (msgs_array_length == 0) {
        Napi::TypeError::New(env, "BLST_ERROR: msgs must have length > 0")
            .ThrowAsJavaScriptException();
        return blst_ts::BLST_TS_ERROR::JS_ERROR_THROWN;
    }

    if (!info[1].IsArray()) {
        Napi::TypeError::New(env, "publicKeys must be of type PublicKeyArg[]")
            .ThrowAsJavaScriptException();
        return blst_ts::BLST_TS_ERROR::JS_ERROR_THROWN;
    }
    Napi::Array pk_array = info[1].As<Napi::Array>();
    uint32_t pk_array_length = pk_array.Length();
    if (pk_array_length == 0) {
        if (sig_point.raw_point->is_inf()) {
            return blst_ts::BLST_TS_ERROR::INVALID;
        }
        Napi::TypeError::New(env, "BLST_ERROR: publicKeys must have length > 0")
            .ThrowAsJavaScriptException();
        return blst_ts::BLST_TS_ERROR::JS_ERROR_THROWN;
    }

    if (msgs_array_length != pk_array_length) {
        Napi::TypeError::New(
            env, "BLST_ERROR: msgs and publicKeys must be the same length")
            .ThrowAsJavaScriptException();
        return blst_ts::BLST_TS_ERROR::JS_ERROR_THROWN;
    }

    sets.reserve(pk_array_length);
    for (uint32_t i = 0; i < pk_array_length; i++) {
        sets.push_back({blst_ts::P1AffineGroup{}, nullptr, 0});

        Napi::Value msg_value = msgs_array[i];
        BLST_TS_FUNCTION_UNWRAP_UINT_8_ARRAY(msg_value, msg, "msg");
        sets[i].msg = msg.Data();
        sets[i].msg_len = msg.ByteLength();

        err = unwrap_public_key(sets[i].pk_point, env, pk_array[i]);
        if (err != blst_ts::BLST_TS_ERROR::SUCCESS) {
            return err;
        }
    }

    return blst_ts::BLST_TS_ERROR::SUCCESS;
}

/**
 * @param[out] result    - Result of the verification
 * @param[out] error_msg - Error message for invalid aggregate
 * @param[in]  module    - Addon module
 * @param[in]  ctx       - Pointer to paring for the verification
 * @param[in]  sig_point - P2 point for verification
 * @param[in]  sets      - Sets to be added to pairing
 */
blst_ts::BLST_TS_ERROR aggregate_verify(
    bool &result,
    std::string &error_msg,
    BlstTsAddon *module,
    std::unique_ptr<blst::Pairing> &ctx,
    blst_ts::P2AffineGroup &sig_point,
    std::vector<AggregateVerifySet> &sets) {
    for (uint32_t i = 0; i < sets.size(); i++) {
        blst::BLST_ERROR err = ctx->aggregate(
            sets[i].pk_point.raw_point,
            sig_point.raw_point,
            sets[i].msg,
            sets[i].msg_len);
        if (err != blst::BLST_ERROR::BLST_SUCCESS) {
            error_msg = "BLST_ERROR::"s + module->GetBlstErrorString(err) +
                        ": Invalid verification aggregate at index "s +
                        std::to_string(i);
            return blst_ts::BLST_TS_ERROR::HAS_NATIVE_ERROR;
        }
    }

    ctx->commit();
    blst::PT pt{*sig_point.raw_point};
    result = ctx->finalverify(&pt);

    return blst_ts::BLST_TS_ERROR::SUCCESS;
}

Napi::Value AggregateVerify(const Napi::CallbackInfo &info) {
    BLST_TS_FUNCTION_PREAMBLE(info, env, module)
    try {
        bool result{false};
        std::string error_msg{};
        blst_ts::P2AffineGroup sig_point{};
        std::vector<AggregateVerifySet> sets{};
        blst_ts::BLST_TS_ERROR error =
            prepare_aggregate_verify(sig_point, sets, info);
        if (error == blst_ts::BLST_TS_ERROR::SUCCESS) {
            std::unique_ptr<blst::Pairing> ctx =
                std::make_unique<blst::Pairing>(true, module->dst);
            error = aggregate_verify(
                result, error_msg, module, ctx, sig_point, sets);
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
        return scope.Escape(Napi::Boolean::New(env, false));
    }
}

class AggregateVerifyWorker : public Napi::AsyncWorker {
   public:
    AggregateVerifyWorker(
        const Napi::CallbackInfo &info,
        BlstTsAddon *module,
        blst_ts::P2AffineGroup sig_point,
        std::vector<AggregateVerifySet> sets)
        : Napi::AsyncWorker{info.Env(), "AggregateVerifyWorker"},
          deferred{Env()},
          _module{std::move(module)},
          _ctx{std::make_unique<blst::Pairing>(true, _module->dst)},
          _sig_point{std::move(sig_point)},
          _sets{std::move(sets)},
          _msgs_ref{Napi::Persistent(info[0])},
          _pks_ref{Napi::Persistent(info[1])},
          _sig_ref{Napi::Persistent(info[2])},
          _result{false} {}

    /**
     * GetPromise associated with deferred for return to JS
     */
    Napi::Promise GetPromise() { return deferred.Promise(); }

   protected:
    void Execute() {
        std::string error_msg{};
        blst_ts::BLST_TS_ERROR err = aggregate_verify(
            _result, error_msg, _module, _ctx, _sig_point, _sets);
        if (err == blst_ts::BLST_TS_ERROR::HAS_NATIVE_ERROR) {
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
    blst_ts::P2AffineGroup _sig_point;
    std::vector<AggregateVerifySet> _sets;
    Napi::Reference<Napi::Value> _msgs_ref;
    Napi::Reference<Napi::Value> _pks_ref;
    Napi::Reference<Napi::Value> _sig_ref;
    bool _result;
};

Napi::Value AsyncAggregateVerify(const Napi::CallbackInfo &info) {
    BLST_TS_FUNCTION_PREAMBLE(info, env, module)
    blst_ts::P2AffineGroup sig_point{};
    std::vector<AggregateVerifySet> sets{};
    blst_ts::BLST_TS_ERROR error;
    try {
        error = prepare_aggregate_verify(sig_point, sets, info);
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
    AggregateVerifyWorker *worker = new AggregateVerifyWorker(
        info, module, std::move(sig_point), std::move(sets));
    worker->Queue();
    return worker->GetPromise();
}
}  // namespace blst_ts_functions
