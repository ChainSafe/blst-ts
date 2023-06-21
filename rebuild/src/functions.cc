#include "functions.h"

namespace {
Napi::Value AggregatePublicKeys(const Napi::CallbackInfo &info) {
    return info.Env().Undefined();
}

Napi::Value AggregateSignatures(const Napi::CallbackInfo &info) {
    return info.Env().Undefined();
}

Napi::Value AggregateVerify(const Napi::CallbackInfo &info) {
    return info.Env().Undefined();
}

Napi::Value VerifyMultipleAggregateSignatures(const Napi::CallbackInfo &info) {
    return info.Env().Undefined();
}
}  // anonymous namespace

namespace Functions {
void Init(const Napi::Env &env, Napi::Object &exports) {
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
        Napi::String::New(env, "verifyMultipleAggregateSignatures"),
        Napi::Function::New(env, VerifyMultipleAggregateSignatures));
}
}  // namespace Functions