#include "public_key.h"

void PublicKey::Init(Napi::Env env, Napi::Object &exports, BlstTsAddon *module)
{
    Napi::HandleScope scope(env); // no need to Escape, Persistent will take care of it
    auto proto = {
        StaticMethod("deserialize", &PublicKey::Deserialize, static_cast<napi_property_attributes>(napi_static | napi_enumerable)),
        InstanceMethod("serialize", &PublicKey::Serialize, static_cast<napi_property_attributes>(napi_enumerable)),
        InstanceMethod("keyValidate", &PublicKey::KeyValidate, static_cast<napi_property_attributes>(napi_enumerable)),
    };

    Napi::Function ctr = DefineClass(env, "PublicKey", proto, module);
    module->_public_key_ctr = Napi::Persistent(ctr);
    // These tag values must be unique across all classes
    module->_public_key_tag = {2ULL, 3ULL};
    exports.Set(Napi::String::New(env, "PublicKey"), ctr);

    Napi::Object js_exports = exports
                                  .Get("BLST_CONSTANTS")
                                  .As<Napi::Object>();
    js_exports.Set(Napi::String::New(env, "PUBLIC_KEY_LENGTH_COMPRESSED"), Napi::Number::New(env, BLST_TS_PUBLIC_KEY_LENGTH_COMPRESSED));
    js_exports.Set(Napi::String::New(env, "PUBLIC_KEY_LENGTH_UNCOMPRESSED"), Napi::Number::New(env, BLST_TS_PUBLIC_KEY_LENGTH_UNCOMPRESSED));
}

Napi::Value PublicKey::Deserialize(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    Napi::EscapableHandleScope scope(env);

    BLST_TS_UNWRAP_UINT_8_ARRAY(0, pk_bytes, "pkBytes")
    std::string err_out{"pkBytes"};
    if (!is_valid_length(
            err_out,
            pk_bytes.ByteLength(),
            BLST_TS_PUBLIC_KEY_LENGTH_COMPRESSED,
            BLST_TS_PUBLIC_KEY_LENGTH_UNCOMPRESSED))
    {
        Napi::TypeError::New(env, err_out).ThrowAsJavaScriptException();
        return scope.Escape(env.Undefined());
    }

    BLST_TS_CREAT_UNWRAPPED_OBJECT(public_key, PublicKey, pk)
    // default to jacobian
    pk->_has_jacobian = true;

    // but figure out if request for affine
    if (!info[1].IsUndefined())
    {
        Napi::Value type_val = info[1].As<Napi::Value>();
        if (!type_val.IsNumber())
        {
            Napi::TypeError::New(env, "type must be of enum CoordType (number)").ThrowAsJavaScriptException();
            return scope.Escape(env.Undefined());
        }
        if (type_val.As<Napi::Number>().Uint32Value() == 0)
        {
            pk->_has_jacobian = false;
            pk->_has_affine = true;
        }
    }

    try
    {
        if (pk->_has_jacobian)
        {
            pk->_jacobian.reset(new blst::P1{pk_bytes.Data(), pk_bytes.ByteLength()});
        }
        else
        {
            pk->_affine.reset(new blst::P1_Affine{pk_bytes.Data(), pk_bytes.ByteLength()});
        }
    }
    catch (blst::BLST_ERROR err)
    {
        Napi::RangeError::New(env, module->GetBlstErrorString(err)).ThrowAsJavaScriptException();
        return scope.Escape(env.Undefined());
    }

    /**
     * TODO: Check for zero key for spec tests
     */

    return scope.Escape(wrapped);
}

PublicKey::PublicKey(const Napi::CallbackInfo &info)
    : Napi::ObjectWrap<PublicKey>{info},
      _has_jacobian{false},
      _has_affine{false},
      _jacobian{nullptr},
      _affine{nullptr}
{
    Napi::Env env = info.Env();
    Napi::HandleScope scope(env);
    // Check that constructor was called from C++ and not JS. Externals can only
    // be created natively.
    if (!info[0].IsExternal())
    {
        Napi::Error::New(env, "PublicKey constructor is private").ThrowAsJavaScriptException();
        return;
    }
};

Napi::Value PublicKey::Serialize(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    Napi::EscapableHandleScope scope(env);

    bool compressed{true};
    if (!info[0].IsUndefined())
    {
        compressed = info[0].ToBoolean().Value();
    }
    Napi::Buffer<uint8_t> serialized = Napi::Buffer<uint8_t>::New(
        env,
        compressed
            ? BLST_TS_PUBLIC_KEY_LENGTH_COMPRESSED
            : BLST_TS_PUBLIC_KEY_LENGTH_UNCOMPRESSED);

    if (_has_jacobian)
    {
        compressed ? _jacobian->compress(serialized.Data()) : _jacobian->serialize(serialized.Data());
    }
    else if (_has_affine)
    {
        compressed ? _affine->compress(serialized.Data()) : _affine->serialize(serialized.Data());
    }
    else
    {
        Napi::Error::New(env, "PublicKey cannot be serialized. No point found!").ThrowAsJavaScriptException();
        return scope.Escape(env.Undefined());
    }

    return scope.Escape(serialized);
}

Napi::Value PublicKey::KeyValidate(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    Napi::EscapableHandleScope scope(env);

    if (_has_jacobian)
    {
        if (_jacobian->is_inf())
        {
            Napi::Error::New(env, "blst::BLST_PK_IS_INFINITY").ThrowAsJavaScriptException();
        }
        else if (!_jacobian->in_group())
        {
            Napi::Error::New(env, "blst::BLST_POINT_NOT_IN_GROUP").ThrowAsJavaScriptException();
        }
    }
    else if (_has_affine)
    {
        if (_affine->is_inf())
        {
            Napi::Error::New(env, "blst::BLST_PK_IS_INFINITY").ThrowAsJavaScriptException();
        }
        else if (!_affine->in_group())
        {
            Napi::Error::New(env, "blst::BLST_POINT_NOT_IN_GROUP").ThrowAsJavaScriptException();
        }
    }
    else
    {
        Napi::Error::New(env, "blst::BLST_PK_IS_INFINITY").ThrowAsJavaScriptException();
    }

    return scope.Escape(info.Env().Undefined());
}