#pragma once

#include <memory>

#include "addon.h"
#include "public_key.h"
#include "signature.h"

static const size_t secret_key_length = 32;

class SecretKey : public Napi::ObjectWrap<SecretKey> {
   public:
    std::unique_ptr<blst::SecretKey> key;
    bool is_zero_key;

    static void Init(Napi::Env env, Napi::Object &exports, BlstTsAddon *module);
    static Napi::Value FromKeygen(const Napi::CallbackInfo &info);
    static Napi::Value Deserialize(const Napi::CallbackInfo &info);
    SecretKey(const Napi::CallbackInfo &info);
    Napi::Value Serialize(const Napi::CallbackInfo &info);
    Napi::Value ToPublicKey(const Napi::CallbackInfo &info);
    Napi::Value Sign(const Napi::CallbackInfo &info);
};
