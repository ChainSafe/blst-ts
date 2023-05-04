#ifndef BLST_TS_FUNCTIONS_H__
#define BLST_TS_FUNCTIONS_H__

#include <sstream>
#include <vector>
#include <memory>
#include "napi.h"
#include "blst.hpp"
#include "addon.h"
#include "public_key.h"
#include "signature.h"

namespace Functions
{
    Napi::Value AggregatePublicKeys(const Napi::CallbackInfo &info);
    Napi::Value AggregatePublicKeysSync(const Napi::CallbackInfo &info);
    Napi::Value AggregateSignatures(const Napi::CallbackInfo &info);
    Napi::Value AggregateSignaturesSync(const Napi::CallbackInfo &info);
    Napi::Value Verify(const Napi::CallbackInfo &info);
    Napi::Value VerifySync(const Napi::CallbackInfo &info);
    Napi::Value AggregateVerify(const Napi::CallbackInfo &info);
    Napi::Value AggregateVerifySync(const Napi::CallbackInfo &info);
    Napi::Value FastAggregateVerify(const Napi::CallbackInfo &info);
    Napi::Value FastAggregateVerifySync(const Napi::CallbackInfo &info);
    Napi::Value VerifyMultipleAggregateSignatures(const Napi::CallbackInfo &info);
    Napi::Value VerifyMultipleAggregateSignaturesSync(const Napi::CallbackInfo &info);
    Napi::Value TestSync(const Napi::CallbackInfo &info);
    Napi::Value TestAsync(const Napi::CallbackInfo &info);

    void Init(const Napi::Env &env, Napi::Object &exports);
}

#endif /* BLST_TS_FUNCTIONS_H__ */
