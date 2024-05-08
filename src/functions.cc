#include "addon.h"

namespace blst_ts_functions {
Napi::Value AggregatePublicKeys(const Napi::CallbackInfo &info);
Napi::Value AggregateSignatures(const Napi::CallbackInfo &info);
Napi::Value AggregateVerify(const Napi::CallbackInfo &info);
Napi::Value AsyncAggregateVerify(const Napi::CallbackInfo &info);
Napi::Value VerifyMultipleAggregateSignatures(const Napi::CallbackInfo &info);
Napi::Value AsyncVerifyMultipleAggregateSignatures(const Napi::CallbackInfo &info);

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
