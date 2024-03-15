#include "addon.h"

using namespace std::string_literals;

namespace {
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
                std::string err_out{"BLST_ERROR: PublicKeyArg"};
                if (!blst_ts::is_valid_length(
                        err_out,
                        typed_array.ByteLength(),
                        blst_ts::public_key_length_compressed,
                        blst_ts::public_key_length_uncompressed)) {
                    Napi::TypeError::New(env, err_out)
                        .ThrowAsJavaScriptException();
                    has_error = true;
                } else if (blst_ts::is_zero_bytes(
                               typed_array.Data(),
                               0,
                               typed_array.ByteLength())) {
                    Napi::TypeError::New(
                        env, "BLST_ERROR: PublicKeyArg must not be zero key")
                        .ThrowAsJavaScriptException();
                    has_error = true;
                } else {
                    aggregate.add(
                        blst::P1{typed_array.Data(), typed_array.ByteLength()});
                }
            } else {
                blst_ts::PublicKey *to_aggregate =
                    blst_ts::PublicKey::Unwrap(val.As<Napi::Object>());
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
                std::string err_out{"BLST_ERROR: SignatureArg"};
                if (!blst_ts::is_valid_length(
                        err_out,
                        typed_array.ByteLength(),
                        blst_ts::signature_length_compressed,
                        blst_ts::signature_length_uncompressed)) {
                    Napi::TypeError::New(env, err_out)
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

Napi::Value AggregateVerify(const Napi::CallbackInfo &info) {
    BLST_TS_FUNCTION_PREAMBLE(info, env, module)
    try {
        Napi::Value sig_val = info[2];
        blst_ts::P2AffineGroup sig_point;
        if (sig_val.IsTypedArray()) {
            Napi::Uint8Array typed_array = sig_val.As<Napi::Uint8Array>();
            std::string err_out{"BLST_ERROR: SignatureArg"};
            if (!blst_ts::is_valid_length(
                    err_out,
                    typed_array.ByteLength(),
                    blst_ts::signature_length_compressed,
                    blst_ts::signature_length_uncompressed)) {
                Napi::TypeError::New(env, err_out).ThrowAsJavaScriptException();
                return env.Undefined();
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

        if (!info[0].IsArray()) {
            Napi::TypeError::New(
                env, "BLST_ERROR: msgs must be of type BlstBuffer[]")
                .ThrowAsJavaScriptException();
            return env.Undefined();
        }
        Napi::Array msgs_array = info[0].As<Napi::Array>();
        uint32_t msgs_array_length = msgs_array.Length();
        if (msgs_array_length == 0) {
            Napi::TypeError::New(env, "BLST_ERROR: msgs must have length > 0")
                .ThrowAsJavaScriptException();
            return env.Undefined();
        }

        if (!info[1].IsArray()) {
            Napi::TypeError::New(
                env, "publicKeys must be of type PublicKeyArg[]")
                .ThrowAsJavaScriptException();
            return env.Undefined();
        }
        Napi::Array pk_array = info[1].As<Napi::Array>();
        uint32_t pk_array_length = pk_array.Length();
        if (pk_array_length == 0) {
            if (sig_point.raw_point->is_inf()) {
                return scope.Escape(Napi::Boolean::New(env, false));
            }
            Napi::TypeError::New(
                env, "BLST_ERROR: publicKeys must have length > 0")
                .ThrowAsJavaScriptException();
            return env.Undefined();
        }

        if (msgs_array_length != pk_array_length) {
            Napi::TypeError::New(
                env, "BLST_ERROR: msgs and publicKeys must be the same length")
                .ThrowAsJavaScriptException();
            return env.Undefined();
        }

        std::unique_ptr<blst::Pairing> ctx{
            new blst::Pairing(true, module->dst)};
        for (uint32_t i = 0; i < pk_array_length; i++) {
            Napi::Value msg_value = msgs_array[i];
            BLST_TS_UNWRAP_UINT_8_ARRAY(msg_value, msg, "msg")

            Napi::Value pk_val = pk_array[i];
            blst_ts::P1AffineGroup pk_point;
            if (pk_val.IsTypedArray()) {
                Napi::Uint8Array typed_array = pk_val.As<Napi::Uint8Array>();
                std::string err_out{"BLST_ERROR: PublicKeyArg"};
                if (!blst_ts::is_valid_length(
                        err_out,
                        typed_array.ByteLength(),
                        blst_ts::public_key_length_compressed,
                        blst_ts::public_key_length_uncompressed)) {
                    Napi::TypeError::New(env, err_out)
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
                    pk_point.smart_pointer = std::make_unique<blst::P1_Affine>(
                        typed_array.Data(), typed_array.ByteLength());
                    pk_point.raw_point = pk_point.smart_pointer.get();
                }
            } else {
                blst_ts::PublicKey *to_verify =
                    blst_ts::PublicKey::Unwrap(pk_val.As<Napi::Object>());
                pk_point = to_verify->point->AsAffine();
            }

            blst::BLST_ERROR err = ctx->aggregate(
                pk_point.raw_point,
                sig_point.raw_point,
                msg.Data(),
                msg.ByteLength());
            if (err != blst::BLST_ERROR::BLST_SUCCESS) {
                Napi::Error::New(
                    env,
                    "BLST_ERROR::"s + module->GetBlstErrorString(err) +
                        ": Invalid verification aggregate at index "s +
                        std::to_string(i))
                    .ThrowAsJavaScriptException();
                return env.Undefined();
            }
        }

        ctx->commit();
        blst::PT pt{*sig_point.raw_point};
        return Napi::Boolean::New(env, ctx->finalverify(&pt));
    } catch (...) {
        return Napi::Boolean::New(env, false);
    }
}

typedef struct {
    blst_ts::P1AffineGroup pk_point;
    uint8_t *msg;
    size_t msg_len;
} AggregateVerifySet;

class AggregateVerifyWorker : public Napi::AsyncWorker {
   public:
    AggregateVerifyWorker(const Napi::CallbackInfo &info)
        : Napi::AsyncWorker{info.Env(), "AggregateVerifyWorker"},
          m_deferred{Env()},
          m_has_error{false},
          m_module{Env().GetInstanceData<BlstTsAddon>()},
          m_ctx{new blst::Pairing(true, m_module->dst)},
          m_sig_point{},
          m_sets{},
          m_is_invalid{false},
          m_result{false} {
        Napi::Env env = Env();
        try {
            Napi::Value sig_val = info[2];
            if (sig_val.IsTypedArray()) {
                Napi::Uint8Array typed_array = sig_val.As<Napi::Uint8Array>();
                std::string err_out{"BLST_ERROR: SignatureArg"};
                if (!blst_ts::is_valid_length(
                        err_out,
                        typed_array.ByteLength(),
                        blst_ts::signature_length_compressed,
                        blst_ts::signature_length_uncompressed)) {
                    Napi::TypeError::New(env, err_out)
                        .ThrowAsJavaScriptException();
                    m_has_error = true;
                    return;
                } else {
                    m_sig_point.smart_pointer =
                        std::make_unique<blst::P2_Affine>(
                            typed_array.Data(), typed_array.ByteLength());
                    m_sig_point.raw_point = m_sig_point.smart_pointer.get();
                }
            } else {
                blst_ts::Signature *to_verify =
                    blst_ts::Signature::Unwrap(sig_val.As<Napi::Object>());
                m_sig_point = to_verify->point->AsAffine();
            }

            if (!info[0].IsArray()) {
                Napi::TypeError::New(
                    env, "BLST_ERROR: msgs must be of type BlstBuffer[]")
                    .ThrowAsJavaScriptException();
                m_has_error = true;
                return;
            }
            Napi::Array msgs_array = info[0].As<Napi::Array>();
            uint32_t msgs_array_length = msgs_array.Length();
            if (msgs_array_length == 0) {
                Napi::TypeError::New(
                    env, "BLST_ERROR: msgs must have length > 0")
                    .ThrowAsJavaScriptException();
                m_has_error = true;
                return;
            }

            if (!info[1].IsArray()) {
                Napi::TypeError::New(
                    env, "publicKeys must be of type PublicKeyArg[]")
                    .ThrowAsJavaScriptException();
                m_has_error = true;
                return;
            }
            Napi::Array pk_array = info[1].As<Napi::Array>();
            uint32_t pk_array_length = pk_array.Length();
            if (pk_array_length == 0) {
                if (m_sig_point.raw_point->is_inf()) {
                    m_is_invalid = true;
                    return;
                }
                Napi::TypeError::New(
                    env, "BLST_ERROR: publicKeys must have length > 0")
                    .ThrowAsJavaScriptException();
                m_has_error = true;
                return;
            }

            if (msgs_array_length != pk_array_length) {
                Napi::TypeError::New(
                    env,
                    "BLST_ERROR: msgs and publicKeys must be the same length")
                    .ThrowAsJavaScriptException();
                m_has_error = true;
                return;
            }

            m_sets.reserve(pk_array_length);
            for (uint32_t i = 0; i < pk_array_length; i++) {
                m_sets.push_back({blst_ts::P1AffineGroup{}, nullptr, 0});

                Napi::Value msg_value = msgs_array[i];
                BLST_TS_CLASS_UNWRAP_UINT_8_ARRAY(msg_value, msg, "msg")
                m_sets[i].msg = msg.Data();
                m_sets[i].msg_len = msg.ByteLength();

                Napi::Value pk_val = pk_array[i];
                if (pk_val.IsTypedArray()) {
                    Napi::Uint8Array typed_array =
                        pk_val.As<Napi::Uint8Array>();
                    std::string err_out{"BLST_ERROR: PublicKeyArg"};
                    if (!blst_ts::is_valid_length(
                            err_out,
                            typed_array.ByteLength(),
                            blst_ts::public_key_length_compressed,
                            blst_ts::public_key_length_uncompressed)) {
                        Napi::TypeError::New(env, err_out)
                            .ThrowAsJavaScriptException();
                        m_is_invalid = true;
                        return;
                    } else if (blst_ts::is_zero_bytes(
                                   typed_array.Data(),
                                   0,
                                   typed_array.ByteLength())) {
                        Napi::TypeError::New(
                            env,
                            "BLST_ERROR: PublicKeyArg must not be zero key")
                            .ThrowAsJavaScriptException();
                        m_is_invalid = true;
                        return;
                    } else {
                        m_sets[i].pk_point.smart_pointer =
                            std::make_unique<blst::P1_Affine>(
                                typed_array.Data(), typed_array.ByteLength());
                        m_sets[i].pk_point.raw_point =
                            m_sets[i].pk_point.smart_pointer.get();
                    }
                } else {
                    blst_ts::PublicKey *to_verify =
                        blst_ts::PublicKey::Unwrap(pk_val.As<Napi::Object>());
                    m_sets[i].pk_point = to_verify->point->AsAffine();
                }
            }
        } catch (...) {
            m_is_invalid = true;
        }
    }

    /**
     * GetPromise associated with _deferred for return to JS
     */
    Napi::Promise GetPromise() { return m_deferred.Promise(); }

   protected:
    void Execute() {
        if (m_is_invalid) {
            return;
        }
        for (uint32_t i = 0; i < m_sets.size(); i++) {
            blst::BLST_ERROR err = m_ctx->aggregate(
                m_sets[i].pk_point.raw_point,
                m_sig_point.raw_point,
                m_sets[i].msg,
                m_sets[i].msg_len);
            if (err != blst::BLST_ERROR::BLST_SUCCESS) {
                SetError(
                    "BLST_ERROR::"s + m_module->GetBlstErrorString(err) +
                    ": Invalid verification aggregate at index "s +
                    std::to_string(i));
                return;
            }
        }
        m_ctx->commit();
        blst::PT pt{*m_sig_point.raw_point};
        m_result = m_ctx->finalverify(&pt);
    }
    void OnOK() { m_deferred.Resolve(Napi::Boolean::New(Env(), m_result)); }
    void OnError(const Napi::Error &err) { m_deferred.Reject(err.Value()); }

   public:
    Napi::Promise::Deferred m_deferred;
    bool m_has_error;

   private:
    BlstTsAddon *m_module;
    std::unique_ptr<blst::Pairing> m_ctx;
    blst_ts::P2AffineGroup m_sig_point;
    std::vector<AggregateVerifySet> m_sets;
    bool m_is_invalid;
    bool m_result;
};

Napi::Value AsyncAggregateVerify(const Napi::CallbackInfo &info) {
    AggregateVerifyWorker *worker = new AggregateVerifyWorker(info);
    if (worker->m_has_error) {
        delete worker;
        return info.Env().Undefined();
    }
    worker->Queue();
    return worker->GetPromise();
}

Napi::Value VerifyMultipleAggregateSignatures(const Napi::CallbackInfo &info) {
    BLST_TS_FUNCTION_PREAMBLE(info, env, module)
    std::unique_ptr<blst::Pairing> ctx{new blst::Pairing(true, module->dst)};
    try {
        if (!info[0].IsArray()) {
            Napi::TypeError::New(
                env, "BLST_ERROR: signatureSets must be of type SignatureSet[]")
                .ThrowAsJavaScriptException();
            return env.Undefined();
        }
        Napi::Array sets_array = info[0].As<Napi::Array>();
        uint32_t sets_array_length = sets_array.Length();

        for (uint32_t i = 0; i < sets_array_length; i++) {
            blst::byte rand[BLST_TS_RANDOM_BYTES_LENGTH];
            if (!module->GetRandomBytes(rand, BLST_TS_RANDOM_BYTES_LENGTH)) {
                Napi::Error::New(
                    env, "BLST_ERROR: Failed to generate random bytes")
                    .ThrowAsJavaScriptException();
                return env.Undefined();
            }

            Napi::Value set_value = sets_array[i];
            if (!set_value.IsObject()) {
                Napi::TypeError::New(
                    env, "BLST_ERROR: signatureSet must be an object")
                    .ThrowAsJavaScriptException();
                return env.Undefined();
            }
            Napi::Object set = set_value.As<Napi::Object>();

            Napi::Value msg_value = set.Get("message");
            BLST_TS_UNWRAP_UINT_8_ARRAY(msg_value, msg, "message")

            Napi::Value pk_val = set.Get("publicKey");
            blst_ts::P1AffineGroup pk_point;
            if (pk_val.IsTypedArray()) {
                Napi::Uint8Array typed_array = pk_val.As<Napi::Uint8Array>();
                std::string err_out{"BLST_ERROR: PublicKeyArg"};
                if (!blst_ts::is_valid_length(
                        err_out,
                        typed_array.ByteLength(),
                        blst_ts::public_key_length_compressed,
                        blst_ts::public_key_length_uncompressed)) {
                    Napi::TypeError::New(env, err_out)
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
                    pk_point.smart_pointer = std::make_unique<blst::P1_Affine>(
                        typed_array.Data(), typed_array.ByteLength());
                    pk_point.raw_point = pk_point.smart_pointer.get();
                }
            } else {
                blst_ts::PublicKey *to_verify =
                    blst_ts::PublicKey::Unwrap(pk_val.As<Napi::Object>());
                pk_point = to_verify->point->AsAffine();
            }

            Napi::Value sig_val = set.Get("signature");
            blst_ts::P2AffineGroup sig_point;
            if (sig_val.IsTypedArray()) {
                Napi::Uint8Array typed_array = sig_val.As<Napi::Uint8Array>();
                std::string err_out{"BLST_ERROR: SignatureArg"};
                if (!blst_ts::is_valid_length(
                        err_out,
                        typed_array.ByteLength(),
                        blst_ts::signature_length_compressed,
                        blst_ts::signature_length_uncompressed)) {
                    Napi::TypeError::New(env, err_out)
                        .ThrowAsJavaScriptException();
                    return env.Undefined();
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

            blst::BLST_ERROR err = ctx->mul_n_aggregate(
                pk_point.raw_point,
                sig_point.raw_point,
                rand,
                BLST_TS_RANDOM_BYTES_LENGTH,
                msg.Data(),
                msg.ByteLength());
            if (err != blst::BLST_ERROR::BLST_SUCCESS) {
                Napi::Error::New(
                    env,
                    module->GetBlstErrorString(err) +
                        ": Invalid batch aggregation at index "s +
                        std::to_string(i))
                    .ThrowAsJavaScriptException();
                return env.Undefined();
            }
        }
        ctx->commit();
        return Napi::Boolean::New(env, ctx->finalverify());
    } catch (...) {
        return Napi::Boolean::New(env, false);
    }
}

typedef struct {
    blst_ts::P1AffineGroup pk_point;
    blst_ts::P2AffineGroup sig_point;
    uint8_t *msg;
    size_t msg_len;
} SignatureSet;

class VerifyMultipleAggregateSignaturesWorker : public Napi::AsyncWorker {
   public:
    VerifyMultipleAggregateSignaturesWorker(const Napi::CallbackInfo &info)
        : Napi::
              AsyncWorker{info.Env(), "VerifyMultipleAggregateSignaturesWorker"},
          m_deferred{Env()},
          m_has_error{false},
          m_module{Env().GetInstanceData<BlstTsAddon>()},
          m_ctx{new blst::Pairing(true, m_module->dst)},
          m_sets{},
          m_result{false} {
        Napi::Env env = Env();
        if (!info[0].IsArray()) {
            Napi::Error::New(
                env, "BLST_ERROR: signatureSets must be of type SignatureSet[]")
                .ThrowAsJavaScriptException();
            m_has_error = true;
            return;
        }
        Napi::Array sets_array = info[0].As<Napi::Array>();
        uint32_t sets_array_length = sets_array.Length();

        m_sets.reserve(sets_array_length);
        try {
            for (uint32_t i = 0; i < sets_array_length; i++) {
                Napi::Value set_value = sets_array[i];
                if (!set_value.IsObject()) {
                    Napi::Error::New(
                        env, "BLST_ERROR: signatureSet must be an object")
                        .ThrowAsJavaScriptException();
                    m_has_error = true;
                    return;
                }
                Napi::Object set = set_value.As<Napi::Object>();

                Napi::Value msg_value = set.Get("message");
                BLST_TS_CLASS_UNWRAP_UINT_8_ARRAY(msg_value, msg, "message")

                m_sets.push_back(
                    {blst_ts::P1AffineGroup{},
                     blst_ts::P2AffineGroup{},
                     msg.Data(),
                     msg.ByteLength()});

                Napi::Value pk_val = set.Get("publicKey");
                if (pk_val.IsTypedArray()) {
                    Napi::Uint8Array typed_array =
                        pk_val.As<Napi::Uint8Array>();
                    std::string err_out{"BLST_ERROR: PublicKeyArg"};
                    if (!blst_ts::is_valid_length(
                            err_out,
                            typed_array.ByteLength(),
                            blst_ts::public_key_length_compressed,
                            blst_ts::public_key_length_uncompressed)) {
                        Napi::TypeError::New(env, err_out)
                            .ThrowAsJavaScriptException();
                        m_has_error = true;
                        return;
                    } else if (blst_ts::is_zero_bytes(
                                   typed_array.Data(),
                                   0,
                                   typed_array.ByteLength())) {
                        Napi::TypeError::New(
                            env,
                            "BLST_ERROR: PublicKeyArg must not be zero key")
                            .ThrowAsJavaScriptException();
                        m_has_error = true;
                        return;
                    } else {
                        m_sets[i].pk_point.smart_pointer =
                            std::make_unique<blst::P1_Affine>(
                                typed_array.Data(), typed_array.ByteLength());
                        m_sets[i].pk_point.raw_point =
                            m_sets[i].pk_point.smart_pointer.get();
                    }
                } else {
                    blst_ts::PublicKey *to_verify =
                        blst_ts::PublicKey::Unwrap(pk_val.As<Napi::Object>());
                    m_sets[i].pk_point = to_verify->point->AsAffine();
                }

                Napi::Value sig_val = set.Get("signature");
                if (sig_val.IsTypedArray()) {
                    Napi::Uint8Array typed_array =
                        sig_val.As<Napi::Uint8Array>();
                    std::string err_out{"BLST_ERROR: SignatureArg"};
                    if (!blst_ts::is_valid_length(
                            err_out,
                            typed_array.ByteLength(),
                            blst_ts::signature_length_compressed,
                            blst_ts::signature_length_uncompressed)) {
                        Napi::TypeError::New(env, err_out)
                            .ThrowAsJavaScriptException();
                        m_has_error = true;
                        return;
                    } else {
                        m_sets[i].sig_point.smart_pointer =
                            std::make_unique<blst::P2_Affine>(
                                typed_array.Data(), typed_array.ByteLength());
                        m_sets[i].sig_point.raw_point =
                            m_sets[i].sig_point.smart_pointer.get();
                    }
                } else {
                    blst_ts::Signature *to_verify =
                        blst_ts::Signature::Unwrap(sig_val.As<Napi::Object>());
                    m_sets[i].sig_point = to_verify->point->AsAffine();
                }
            }
        } catch (const blst::BLST_ERROR &err) {
            Napi::Error::New(env, m_module->GetBlstErrorString(err))
                .ThrowAsJavaScriptException();
            m_has_error = true;
        }
    }

    /**
     * GetPromise associated with _deferred for return to JS
     */
    Napi::Promise GetPromise() { return m_deferred.Promise(); }

   protected:
    void Execute() {
        for (uint32_t i = 0; i < m_sets.size(); i++) {
            blst::byte rand[BLST_TS_RANDOM_BYTES_LENGTH];
            if (!m_module->GetRandomBytes(rand, BLST_TS_RANDOM_BYTES_LENGTH)) {
                SetError("BLST_ERROR: Failed to generate random bytes");
                return;
            }

            blst::BLST_ERROR err = m_ctx->mul_n_aggregate(
                m_sets[i].pk_point.raw_point,
                m_sets[i].sig_point.raw_point,
                rand,
                BLST_TS_RANDOM_BYTES_LENGTH,
                m_sets[i].msg,
                m_sets[i].msg_len);
            if (err != blst::BLST_ERROR::BLST_SUCCESS) {
                SetError(
                    m_module->GetBlstErrorString(err) +
                    ": Invalid batch aggregation at index "s +
                    std::to_string(i));
                return;
            }
        }
        m_ctx->commit();
        m_result = m_ctx->finalverify();
    }
    void OnOK() { m_deferred.Resolve(Napi::Boolean::New(Env(), m_result)); }
    void OnError(const Napi::Error &err) { m_deferred.Reject(err.Value()); }

   public:
    Napi::Promise::Deferred m_deferred;
    bool m_has_error;

   private:
    BlstTsAddon *m_module;
    std::unique_ptr<blst::Pairing> m_ctx;
    std::vector<SignatureSet> m_sets;
    bool m_result;
};

Napi::Value AsyncVerifyMultipleAggregateSignatures(
    const Napi::CallbackInfo &info) {
    VerifyMultipleAggregateSignaturesWorker *worker =
        new VerifyMultipleAggregateSignaturesWorker(info);
    if (worker->m_has_error) {
        delete worker;
        return info.Env().Undefined();
    }
    worker->Queue();
    return worker->GetPromise();
}

}  // anonymous namespace

namespace blst_ts_functions {
void init(const Napi::Env &env, Napi::Object &exports) {
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
        Napi::String::New(env, "asyncAggregateVerify"),
        Napi::Function::New(env, AsyncAggregateVerify));
    exports.Set(
        Napi::String::New(env, "verifyMultipleAggregateSignatures"),
        Napi::Function::New(env, VerifyMultipleAggregateSignatures));
    exports.Set(
        Napi::String::New(env, "asyncVerifyMultipleAggregateSignatures"),
        Napi::Function::New(env, AsyncVerifyMultipleAggregateSignatures));
}
}  // namespace blst_ts_functions
