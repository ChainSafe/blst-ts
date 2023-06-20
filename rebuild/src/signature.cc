#include "signature.h"

void Signature::Init(Napi::Env env, Napi::Object &exports, BlstTsAddon *module)
{
    Napi::HandleScope scope(env); // no need to Escape, Persistent will take care of it
    auto proto = {
        StaticMethod("deserialize", &Signature::Deserialize, static_cast<napi_property_attributes>(napi_static | napi_enumerable)),
        InstanceMethod("serialize", &Signature::Serialize, static_cast<napi_property_attributes>(napi_enumerable)),
        InstanceMethod("sigValidate", &Signature::SigValidate, static_cast<napi_property_attributes>(napi_enumerable)),
    };

    Napi::Function ctr = DefineClass(env, "Signature", proto, module);
    module->_signature_ctr = Napi::Persistent(ctr);
    // These tag values must be unique across all classes
    module->_signature_tag = {4ULL, 5ULL};
    exports.Set(Napi::String::New(env, "Signature"), ctr);

    Napi::Object js_exports = exports
                                  .Get("BLST_CONSTANTS")
                                  .As<Napi::Object>();
    js_exports.Set(Napi::String::New(env, "SIGNATURE_LENGTH_COMPRESSED"), Napi::Number::New(env, BLST_TS_SIGNATURE_LENGTH_COMPRESSED));
    js_exports.Set(Napi::String::New(env, "SIGNATURE_LENGTH_UNCOMPRESSED"), Napi::Number::New(env, BLST_TS_SIGNATURE_LENGTH_UNCOMPRESSED));
}

Napi::Value Signature::Deserialize(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    Napi::EscapableHandleScope scope(env);

    // Pull Value from info and check type is valid
    Napi::Value sig_value = info[0];
    if (!sig_value.IsTypedArray())
    {
        Napi::TypeError::New(env, "sigBytes must be a BlstBuffer").ThrowAsJavaScriptException();
        return scope.Escape(env.Undefined());
    }
    Napi::TypedArray sig_array = sig_value.As<Napi::TypedArray>();
    if (sig_array.TypedArrayType() != napi_uint8_array)
    {
        Napi::TypeError::New(env, "sigBytes must be a BlstBuffer").ThrowAsJavaScriptException();
        return scope.Escape(env.Undefined());
    }
    // Convert to final Uint8Array type and check length is valid
    Napi::Uint8Array sig_bytes = sig_array.As<Napi::TypedArrayOf<uint8_t>>();
    std::string err_out{"sigBytes"};
    if (!is_valid_length(
            err_out,
            sig_bytes.ByteLength(),
            BLST_TS_SIGNATURE_LENGTH_COMPRESSED,
            BLST_TS_SIGNATURE_LENGTH_UNCOMPRESSED))
    {
        Napi::TypeError::New(env, err_out).ThrowAsJavaScriptException();
        return scope.Escape(env.Undefined());
    }
    // Get module for globals and run Signature constructor
    BlstTsAddon *module = env.GetInstanceData<BlstTsAddon>();
    // Allocate object in javascript heap
    Napi::Object wrapped = module->_signature_ctr.New({Napi::External<void>::New(env, nullptr)});
    // Setup object correctly.  Start with type tagging wrapper class.
    wrapped.TypeTag(&module->_signature_tag);
    // Unwrap object to get native instance
    Signature *sig = Signature::Unwrap(wrapped);
    // default to jacobian for now
    sig->_has_jacobian = true;

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
            sig->_has_jacobian = false;
            sig->_has_affine = true;
        }
    }

    try
    {
        if (sig->_has_jacobian)
        {
            sig->_jacobian.reset(new blst::P2{sig_bytes.Data(), sig_bytes.ByteLength()});
        }
        else
        {
            sig->_affine.reset(new blst::P2_Affine{sig_bytes.Data(), sig_bytes.ByteLength()});
        }
    }
    catch (blst::BLST_ERROR err)
    {
        Napi::RangeError::New(env, module->GetBlstErrorString(err)).ThrowAsJavaScriptException();
        return scope.Escape(env.Undefined());
    }

    return scope.Escape(wrapped);
}

Signature::Signature(const Napi::CallbackInfo &info)
    : Napi::ObjectWrap<Signature>{info},
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
        Napi::Error::New(env, "Signature constructor is private").ThrowAsJavaScriptException();
        return;
    }
};

Napi::Value Signature::Serialize(const Napi::CallbackInfo &info)
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
            ? BLST_TS_SIGNATURE_LENGTH_COMPRESSED
            : BLST_TS_SIGNATURE_LENGTH_UNCOMPRESSED);

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
        Napi::Error::New(env, "Signature cannot be serialized. No point found!").ThrowAsJavaScriptException();
        return scope.Escape(env.Undefined());
    }

    return scope.Escape(serialized);
}

Napi::Value Signature::SigValidate(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    Napi::EscapableHandleScope scope(env);

    if (!_has_jacobian && !_has_affine)
    {
        Napi::Error::New(env, "Signature not initialized").ThrowAsJavaScriptException();
    }
    else if (_has_jacobian && !_jacobian->in_group())
    {
        Napi::Error::New(env, "blst::BLST_POINT_NOT_IN_GROUP").ThrowAsJavaScriptException();
    }
    else if (_has_affine && !_affine->in_group())
    {
        Napi::Error::New(env, "blst::BLST_POINT_NOT_IN_GROUP").ThrowAsJavaScriptException();
    }

    return scope.Escape(env.Undefined());
}
