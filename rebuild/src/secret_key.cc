#include "secret_key.h"

void SecretKey::Init(Napi::Env env, Napi::Object &exports, BlstTsAddon *module)
{
    Napi::HandleScope scope(env); // no need to EscapeHandleScope, Persistent will take care of it
    auto proto = {
        StaticMethod("fromKeygen", &SecretKey::FromKeygen, static_cast<napi_property_attributes>(napi_static | napi_enumerable)),
        StaticMethod("deserialize", &SecretKey::Deserialize, static_cast<napi_property_attributes>(napi_static | napi_enumerable)),
        InstanceMethod("serialize", &SecretKey::Serialize, static_cast<napi_property_attributes>(napi_enumerable)),
        InstanceMethod("toPublicKey", &SecretKey::ToPublicKey, static_cast<napi_property_attributes>(napi_enumerable)),
        InstanceMethod("sign", &SecretKey::Sign, static_cast<napi_property_attributes>(napi_enumerable)),
    };

    Napi::Function ctr = DefineClass(env, "SecretKey", proto, module);
    module->_secret_key_ctr = Napi::Persistent(ctr);
    // These tag values must be unique across all classes
    module->_secret_key_tag = {0ULL, 1ULL};
    exports.Set(Napi::String::New(env, "SecretKey"), ctr);

    exports
        .Get("BLST_CONSTANTS")
        .As<Napi::Object>()
        .Set(Napi::String::New(env, "SECRET_KEY_LENGTH"), Napi::Number::New(env, BLST_TS_SECRET_KEY_LENGTH));
}

Napi::Value SecretKey::FromKeygen(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    Napi::EscapableHandleScope scope(env);

    // Pull Value from info and check type is valid
    Napi::Value ikm_value = info[0];
    if (!ikm_value.IsTypedArray())
    {
        Napi::TypeError::New(env, "ikm must be a BlstBuffer").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    Napi::TypedArray ikm_array = ikm_value.As<Napi::TypedArray>();
    if (ikm_array.TypedArrayType() != napi_uint8_array)
    {
        Napi::TypeError::New(env, "ikm must be a BlstBuffer").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    // Convert to final Uint8Array type and check length is valid
    Napi::Uint8Array ikm = ikm_array.As<Napi::TypedArrayOf<uint8_t>>();
    if (ikm.ByteLength() < BLST_TS_SECRET_KEY_LENGTH)
    {
        std::ostringstream msg;
        msg << "ikm must be greater than or equal to " << BLST_TS_SECRET_KEY_LENGTH << " bytes";
        Napi::TypeError::New(env, msg.str()).ThrowAsJavaScriptException();
        return env.Undefined();
    }

    // Get module for globals and run SecretKey constructor
    BlstTsAddon *module = env.GetInstanceData<BlstTsAddon>();
    // Pass void External to constructor so can tell if constructor was called
    // from C or JS to prevent direct calls from JS to ensure proper setup
    Napi::Object wrapped = module->_secret_key_ctr.New({Napi::External<void *>::New(env, nullptr)});
    // Setup object correctly.  Start with type tagging wrapper class.
    wrapped.TypeTag(&module->_secret_key_tag);
    SecretKey *sk = SecretKey::Unwrap(wrapped);
    // If `info` string is passed use it otherwise use default without. Is optional
    // parameter from blst library.
    if (info[1].IsString())
    {
        sk->_key->keygen(ikm.Data(), BLST_TS_SECRET_KEY_LENGTH, info[1].As<Napi::String>().Utf8Value());
    }
    else
    {
        sk->_key->keygen(ikm.Data(), BLST_TS_SECRET_KEY_LENGTH);
    }
    // Check if key is zero and set flag if so. Several specs depend on this check
    blst::byte key_bytes[BLST_TS_SECRET_KEY_LENGTH];
    sk->_key->to_bendian(key_bytes);
    if (is_zero_bytes(key_bytes, 0, BLST_TS_SECRET_KEY_LENGTH))
    {
        sk->_is_zero_key = true;
    }

    return scope.Escape(wrapped);
}

Napi::Value SecretKey::Deserialize(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    Napi::EscapableHandleScope scope(env);

    // Pull Value from info and check type is valid
    Napi::Value sk_bytes_value = info[0];
    if (!sk_bytes_value.IsTypedArray())
    {
        Napi::TypeError::New(env, "skBytes must be a BlstBuffer").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    Napi::TypedArray sk_bytes_array = sk_bytes_value.As<Napi::TypedArray>();
    if (sk_bytes_array.TypedArrayType() != napi_uint8_array)
    {
        Napi::TypeError::New(env, "skBytes must be a BlstBuffer").ThrowAsJavaScriptException();
        return env.Undefined();
    }
    // Convert to final Uint8Array type and check length is valid
    Napi::Uint8Array sk_bytes = sk_bytes_array.As<Napi::TypedArrayOf<uint8_t>>();
    if (sk_bytes.ByteLength() != BLST_TS_SECRET_KEY_LENGTH)
    {
        std::ostringstream msg;
        msg << "skBytes must be " << BLST_TS_SECRET_KEY_LENGTH << " bytes";
        Napi::TypeError::New(env, msg.str()).ThrowAsJavaScriptException();
        return env.Undefined();
    }
    // Get module for globals and run SecretKey constructor
    BlstTsAddon *module = env.GetInstanceData<BlstTsAddon>();
    // Allocate object in javascript heap
    Napi::Object wrapped = module->_secret_key_ctr.New({Napi::External<void *>::New(env, nullptr)});
    // Setup object correctly.  Start with type tagging wrapper class.
    wrapped.TypeTag(&module->_secret_key_tag);
    SecretKey *sk = SecretKey::Unwrap(wrapped);
    // Deserialize key
    sk->_key->from_bendian(sk_bytes.Data());
    // Check if key is zero and set flag if so. Several specs depend on this check
    blst::byte key_bytes[BLST_TS_SECRET_KEY_LENGTH];
    sk->_key->to_bendian(key_bytes);
    if (is_zero_bytes(key_bytes, 0, BLST_TS_SECRET_KEY_LENGTH))
    {
        sk->_is_zero_key = true;
    }

    return scope.Escape(wrapped);
}

SecretKey::SecretKey(const Napi::CallbackInfo &info)
    : Napi::ObjectWrap<SecretKey>{info},
      _key{new blst::SecretKey},
      _is_zero_key{false}
{
    Napi::Env env = info.Env();
    Napi::HandleScope scope(env);
    // Check that constructor was called from C++ and not JS. Externals can only
    // be created natively.
    if (!info[0].IsExternal())
    {
        Napi::Error::New(env, "SecretKey constructor is private").ThrowAsJavaScriptException();
        return;
    }
};

Napi::Value SecretKey::Serialize(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    Napi::EscapableHandleScope scope(env);

    Napi::Buffer<uint8_t> serialized = Napi::Buffer<uint8_t>::New(env, BLST_TS_SECRET_KEY_LENGTH);
    _key->to_bendian(serialized.Data());

    return scope.Escape(serialized);
}

Napi::Value SecretKey::ToPublicKey(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    Napi::EscapableHandleScope scope(env);

    // Get module for globals and run PublicKey constructor
    BlstTsAddon *module = env.GetInstanceData<BlstTsAddon>();
    // Pass void External to constructor so can tell if constructor was called
    // from C or JS to prevent direct calls from JS to ensure proper setup
    Napi::Object wrapped = module->_public_key_ctr.New({Napi::External<void *>::New(Env(), nullptr)});
    // Setup object correctly.  Start with type tagging wrapper class.
    wrapped.TypeTag(&module->_public_key_tag);
    // Unwrap object to get native instance
    PublicKey *pk = PublicKey::Unwrap(wrapped);
    // Derive public key from secret key. Default to jacobian coordinates
    pk->_jacobian.reset(new blst::P1{*_key});
    pk->_has_jacobian = true;

    return scope.Escape(wrapped);
}

Napi::Value SecretKey::Sign(const Napi::CallbackInfo &info)
{
    Napi::Env env = info.Env();
    Napi::EscapableHandleScope scope(env);

    // Check for zero key and throw error to meet spec requirements
    if (_is_zero_key)
    {
        Napi::TypeError::New(env, "cannot sign message with zero private key").ThrowAsJavaScriptException();
        return scope.Escape(info.Env().Undefined());
    }

    // Pull msg Value from info and check type is valid
    Napi::Value msg_value = info[0];
    if (!msg_value.IsTypedArray())
    {
        Napi::TypeError::New(env, "msg must be a BlstBuffer").ThrowAsJavaScriptException();
        return scope.Escape(info.Env().Undefined());
    }
    Napi::TypedArray msg_array = msg_value.As<Napi::TypedArray>();
    if (msg_array.TypedArrayType() != napi_uint8_array)
    {
        Napi::TypeError::New(env, "msg must be a BlstBuffer").ThrowAsJavaScriptException();
        return scope.Escape(info.Env().Undefined());
    }
    // Convert to final Uint8Array type
    Napi::Uint8Array msg = msg_array.As<Napi::TypedArrayOf<uint8_t>>();

    // Get module for globals and run Signature constructor
    BlstTsAddon *module = env.GetInstanceData<BlstTsAddon>();
    // Pass void External to constructor so can tell if constructor was called
    // from C or JS to prevent direct calls from JS to ensure proper setup
    Napi::Object wrapped = module->_signature_ctr.New({Napi::External<void *>::New(Env(), nullptr)});
    // Setup object correctly.  Start with type tagging wrapper class.
    wrapped.TypeTag(&module->_signature_tag);
    // Unwrap object to get native instance
    Signature *sig = Signature::Unwrap(wrapped);
    // Default to jacobian coordinates
    sig->_jacobian.reset(new blst::P2);
    sig->_has_jacobian = true;
    // Hash to point and sign message
    sig->_jacobian->hash_to(msg.Data(), msg.ByteLength(), module->_dst);
    sig->_jacobian->sign_with(*_key);

    return scope.Escape(wrapped);
}
