#ifndef BLST_TS_FUNCTIONS_H__
#define BLST_TS_FUNCTIONS_H__

#include "addon.h"
#include "blst.hpp"
#include "napi.h"

namespace {
Napi::Value AggregatePublicKeys(const Napi::CallbackInfo &info);
Napi::Value AggregateSignatures(const Napi::CallbackInfo &info);
Napi::Value AggregateVerify(const Napi::CallbackInfo &info);
Napi::Value VerifyMultipleAggregateSignatures(const Napi::CallbackInfo &info);
}  // anonymous namespace

namespace Functions {
void Init(const Napi::Env &env, Napi::Object &exports);
}

#endif /* BLST_TS_FUNCTIONS_H__ */
