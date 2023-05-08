#ifndef BLST_TS_PUBLIC_KEY_H__
#define BLST_TS_PUBLIC_KEY_H__

#include <memory>
#include "napi.h"
#include "blst.hpp"
#include "addon.h"
class PublicKey : public BlstBase, public Napi::ObjectWrap<PublicKey>
{
public:
    bool _has_jacobian;
    bool _has_affine;
    std::unique_ptr<blst::P1> _jacobian;
    std::unique_ptr<blst::P1_Affine> _affine;

    static void Init(Napi::Env env, Napi::Object &exports, BlstTsAddon *module);
    static Napi::Value Deserialize(const Napi::CallbackInfo &info);
    PublicKey(const Napi::CallbackInfo &info);
    Napi::Value Serialize(const Napi::CallbackInfo &info);
    Napi::Value KeyValidate(const Napi::CallbackInfo &info);
    Napi::Value KeyValidateSync(const Napi::CallbackInfo &info);

    const blst::P1 *AsJacobian();
    const blst::P1_Affine *AsAffine();
};

#endif /* BLST_TS_PUBLIC_KEY_H__ */