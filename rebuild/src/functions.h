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
    Napi::Value VerifyMultipleAggregateSignatures(const Napi::CallbackInfo &info);
    Napi::Value VerifyMultipleAggregateSignaturesSync(const Napi::CallbackInfo &info);

    void Init(const Napi::Env &env, Napi::Object &exports);
}

#endif /* BLST_TS_FUNCTIONS_H__ */
