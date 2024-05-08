#include "addon.h"
#include "aggregate_with_randomness.h"

namespace blst_ts_functions {
blst_ts::BLST_TS_ERROR unwrap_public_key(
    blst_ts::P1AffineGroup &pk_point,
    const Napi::Env &env,
    const Napi::Value &pk_val) {
    if (pk_val.IsTypedArray()) {
        Napi::Uint8Array typed_array = pk_val.As<Napi::Uint8Array>();
        if (std::optional<std::string> err_msg = blst_ts::is_valid_length(
                typed_array.ByteLength(),
                blst_ts::public_key_length_compressed,
                blst_ts::public_key_length_uncompressed)) {
            return blst_ts::BLST_TS_ERROR::INVALID;
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

    if (pk_point.raw_point->is_inf()) {
        return blst_ts::BLST_TS_ERROR::INVALID;
    }

    return blst_ts::BLST_TS_ERROR::SUCCESS;
}

blst_ts::BLST_TS_ERROR unwrap_signature(
    blst_ts::P2AffineGroup &sig_point,
    const Napi::Env &env,
    const Napi::Value &sig_val) {
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
    return blst_ts::BLST_TS_ERROR::SUCCESS;
}

Napi::Value AggregatePublicKeys(const Napi::CallbackInfo &info);
Napi::Value AggregateSignatures(const Napi::CallbackInfo &info);
Napi::Value AggregateVerify(const Napi::CallbackInfo &info);
Napi::Value AsyncAggregateVerify(const Napi::CallbackInfo &info);
Napi::Value VerifyMultipleAggregateSignatures(const Napi::CallbackInfo &info);
Napi::Value AsyncVerifyMultipleAggregateSignatures(
    const Napi::CallbackInfo &info);

/**
 * Exported init function to set functions on exports
 */
void init(const Napi::Env &env, Napi::Object &exports) {
    exports.Set(
        Napi::String::New(env, "aggregatePublicKeys"),
        Napi::Function::New(env, AggregatePublicKeys));
    exports.Set(
        Napi::String::New(env, "aggregateSignatures"),
        Napi::Function::New(env, AggregateSignatures));
    exports.Set(
        Napi::String::New(env, "aggregateWithRandomness"),
        Napi::Function::New(env, AggregateWithRandomness));
    exports.Set(
        Napi::String::New(env, "asyncAggregateWithRandomness"),
        Napi::Function::New(env, AsyncAggregateWithRandomness));
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
