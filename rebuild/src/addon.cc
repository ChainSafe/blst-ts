#include "addon.h"

bool is_zero_bytes(const uint8_t *data,
                   const size_t start_byte,
                   const size_t byte_length)
{
    for (size_t i = start_byte; i < byte_length; i++)
    {
        if (data[i] != 0)
        {
            return false;
        }
    }
    return true;
}

bool is_valid_length(
    std::string &error_out,
    size_t byte_length,
    size_t length1,
    size_t length2
    )
{
    if (byte_length == length1 || (length2 != 0 && byte_length == length2))
    {
        return true;
    }
    error_out.append(" is " + std::to_string(byte_length) + " bytes, but must be ");
    if (length1 != 0)
    {
        error_out.append(std::to_string(length1));
    };
    if (length2 != 0)
    {
        if (length1 != 0)
        {
            error_out.append(" or ");
        }
        error_out.append(std::to_string(length2));
    };
    error_out.append(" bytes long");
    return false;
};

BlstTsAddon::BlstTsAddon(Napi::Env env, Napi::Object exports)
    : _dst{"BLS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_POP_"},
      _blst_error_strings{
          "BLST_SUCCESS",
          "BLST_BAD_ENCODING",
          "BLST_POINT_NOT_ON_CURVE",
          "BLST_POINT_NOT_IN_GROUP",
          "BLST_AGGR_TYPE_MISMATCH",
          "BLST_VERIFY_FAIL",
          "BLST_PK_IS_INFINITY",
          "BLST_BAD_SCALAR",
      }
{
    Napi::Object js_constants = Napi::Object::New(env);
    js_constants.Set(Napi::String::New(env, "DST"), Napi::String::New(env, _dst));
    DefineAddon(exports, {
                             InstanceValue("BLST_CONSTANTS", js_constants, napi_enumerable),
                         });
    SecretKey::Init(env, exports, this);
    PublicKey::Init(env, exports, this);
    Signature::Init(env, exports, this);
    // Functions::Init(env, exports);
    env.SetInstanceData(this);
}

std::string BlstTsAddon::GetBlstErrorString(const blst::BLST_ERROR &err)
{
    return _blst_error_strings[err];
}

NODE_API_ADDON(BlstTsAddon)