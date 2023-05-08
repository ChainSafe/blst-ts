#ifndef BLST_TS_SIGNATURE_H__
#define BLST_TS_SIGNATURE_H__

#include <memory>
#include "napi.h"
#include "blst.hpp"
#include "addon.h"

class Signature : public BlstBase, public Napi::ObjectWrap<Signature>
{
public:
    bool _has_jacobian;
    bool _has_affine;
    std::unique_ptr<blst::P2> _jacobian;
    std::unique_ptr<blst::P2_Affine> _affine;

    static void Init(Napi::Env env, Napi::Object &exports, BlstTsAddon *module);
    static Napi::Value Deserialize(const Napi::CallbackInfo &info);
    Signature(const Napi::CallbackInfo &info);
    Napi::Value Serialize(const Napi::CallbackInfo &info);
    Napi::Value SigValidate(const Napi::CallbackInfo &info);
    Napi::Value SigValidateSync(const Napi::CallbackInfo &info);

    const blst::P2 *AsJacobian();
    const blst::P2_Affine *AsAffine();
};

#endif /* BLST_TS_SIGNATURE_H__ */