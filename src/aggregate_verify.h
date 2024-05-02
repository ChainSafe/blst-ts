#include "addon.h"

namespace {
typedef struct {
    blst_ts::P1AffineGroup pk_point;
    uint8_t *msg;
    size_t msg_len;
} AggregateVerifySet;

/**
 * @param[out]  {blst_ts::P2AffineGroup} - P2 point for verification
 * @param[out]  {std::vector<AggregateVerifySet>} - Sets to be added to pairing
 */
blst_ts::BLST_TS_ERROR prepare_aggregate_verify(
    blst_ts::P2AffineGroup &sig_point,
    std::vector<AggregateVerifySet> &sets,
    const Napi::CallbackInfo &info) {
    Napi::Env env = info.Env();
    Napi::Value sig_val = info[2];
    if (sig_val.IsTypedArray()) {
        Napi::Uint8Array typed_array = sig_val.As<Napi::Uint8Array>();
        if (std::optional<std::string> err_msg = blst_ts::is_valid_length(
                typed_array.ByteLength(),
                blst_ts::signature_length_compressed,
                blst_ts::signature_length_uncompressed)) {
            return blst_ts::BLST_TS_ERROR::INVALID;
        } else {
            sig_point.smart_pointer = std::make_unique<blst::P2_Affine>(
                typed_array.Data(), typed_array.ByteLength());
            sig_point.raw_point = sig_point.smart_pointer.get();
        }
    } else {
        blst_ts::Signature *to_verify =
            blst_ts::Signature::Unwrap(sig_val.As<Napi::Object>());
        sig_point = to_verify->point->AsAffine();
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
        if (!msg_value.IsTypedArray()) {
            Napi::TypeError::New(env, "BLST_ERROR: msg must be a BlstBuffer")
                .ThrowAsJavaScriptException();
            return blst_ts::BLST_TS_ERROR::JS_ERROR_THROWN;
        }
        Napi::TypedArray msg_array = msg_value.As<Napi::TypedArray>();
        if (msg_array.TypedArrayType() != napi_uint8_array) {
            Napi::TypeError::New(env, "BLST_ERROR: msg must be a BlstBuffer")
                .ThrowAsJavaScriptException();
            return blst_ts::BLST_TS_ERROR::JS_ERROR_THROWN;
        }
        Napi::Uint8Array msg = msg_array.As<Napi::TypedArrayOf<uint8_t>>();
        sets[i].msg = msg.Data();
        sets[i].msg_len = msg.ByteLength();

        Napi::Value pk_val = pk_array[i];
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
    }

    return blst_ts::BLST_TS_ERROR::SUCCESS;
}

/**
 * @param[out]  {boolean} - Result of the verification
 * @param[in]   {blst::Paring *} - Pointer to paring for the verification
 * @param[in]   {blst_ts::P2AffineGroup} - P2 point for verification
 * @param[in]   {std::vector<AggregateVerifySet>} - Sets to be added to
 * pairing
 */
blst_ts::BLST_TS_ERROR aggregate_verify(
    bool &result,
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
            return blst_ts::BLST_TS_ERROR::INVALID;
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
        blst_ts::P2AffineGroup sig_point{};
        std::vector<AggregateVerifySet> sets{};
        blst_ts::BLST_TS_ERROR error =
            prepare_aggregate_verify(sig_point, sets, info);
        if (error == blst_ts::BLST_TS_ERROR::SUCCESS) {
            std::unique_ptr<blst::Pairing> ctx{
                new blst::Pairing(true, module->dst)};
            error = aggregate_verify(result, ctx, sig_point, sets);
        }
        switch (error) {
            case blst_ts::BLST_TS_ERROR::SUCCESS:
                return scope.Escape(Napi::Boolean::New(env, result));
            case blst_ts::BLST_TS_ERROR::JS_ERROR_THROWN:
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
    AggregateVerifyWorker(const Napi::CallbackInfo &info)
        : Napi::AsyncWorker{info.Env(), "AggregateVerifyWorker"},
          deferred{Env()},
          has_error{false},
          _module{Env().GetInstanceData<BlstTsAddon>()},
          _ctx{new blst::Pairing(true, _module->dst)},
          _sig_point{},
          _sets{},
          _msgs_ref{Napi::Persistent(info[0])},
          _pks_ref{Napi::Persistent(info[1])},
          _sig_ref{Napi::Persistent(info[2])},
          _is_invalid{false},
          _result{false} {
        try {
            blst_ts::BLST_TS_ERROR error =
                prepare_aggregate_verify(_sig_point, _sets, info);
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
        aggregate_verify(_result, _ctx, _sig_point, _sets);
    }
    void OnOK() { deferred.Resolve(Napi::Boolean::New(Env(), _result)); }
    void OnError(const Napi::Error &err) { deferred.Reject(err.Value()); }

   public:
    Napi::Promise::Deferred deferred;
    bool has_error;

   private:
    BlstTsAddon *_module;
    std::unique_ptr<blst::Pairing> _ctx;
    blst_ts::P2AffineGroup _sig_point;
    std::vector<AggregateVerifySet> _sets;
    Napi::Reference<Napi::Value> _msgs_ref;
    Napi::Reference<Napi::Value> _pks_ref;
    Napi::Reference<Napi::Value> _sig_ref;
    bool _is_invalid;
    bool _result;
};

Napi::Value AsyncAggregateVerify(const Napi::CallbackInfo &info) {
    AggregateVerifyWorker *worker = new AggregateVerifyWorker(info);
    if (worker->has_error) {
        delete worker;
        return info.Env().Undefined();
    }
    worker->Queue();
    return worker->GetPromise();
}
}  // namespace
