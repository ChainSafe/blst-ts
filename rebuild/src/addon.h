#ifndef BLST_TS_ADDON_H__
#define BLST_TS_ADDON_H__

#include <openssl/rand.h>

#include <iostream>
#include <memory>
#include <sstream>
#include <string>
#include <string_view>

#include "blst.hpp"
#include "napi.h"

// TODO: these should come out post PR review
using std::cout;
using std::endl;

#define BLST_TS_RANDOM_BYTES_LENGTH 8U
#define BLST_TS_SECRET_KEY_LENGTH 32U
#define BLST_TS_PUBLIC_KEY_LENGTH_COMPRESSED 48U
#define BLST_TS_PUBLIC_KEY_LENGTH_UNCOMPRESSED 96U
#define BLST_TS_SIGNATURE_LENGTH_COMPRESSED 96U
#define BLST_TS_SIGNATURE_LENGTH_UNCOMPRESSED 192U

#define BLST_TS_FUNCTION_PREAMBLE                                              \
    Napi::Env env = info.Env();                                                \
    Napi::EscapableHandleScope scope(env);                                     \
    BlstTsAddon *module = env.GetInstanceData<BlstTsAddon>();

#define BLST_TS_UNWRAP_UINT_8_ARRAY(value_name, arr_name, js_name, ret_val)    \
    if (!value_name.IsTypedArray()) {                                          \
        Napi::TypeError::New(env, js_name " must be a BlstBuffer")             \
            .ThrowAsJavaScriptException();                                     \
        return ret_val;                                                        \
    }                                                                          \
    Napi::TypedArray arr_name##_array = value_name.As<Napi::TypedArray>();     \
    if (arr_name##_array.TypedArrayType() != napi_uint8_array) {               \
        Napi::TypeError::New(env, js_name " must be a BlstBuffer")             \
            .ThrowAsJavaScriptException();                                     \
        return ret_val;                                                        \
    }                                                                          \
    Napi::Uint8Array arr_name =                                                \
        arr_name##_array.As<Napi::TypedArrayOf<uint8_t>>();

#define BLST_TS_CREAT_UNWRAPPED_OBJECT(obj_name, class_name, instance_name)    \
    /* Allocate object in javascript heap */                                   \
    Napi::Object wrapped = module->_##obj_name##_ctr.New(                      \
        {Napi::External<void>::New(env, nullptr)});                            \
    /* Setup object correctly.  Start with type tagging wrapper class. */      \
    wrapped.TypeTag(&module->_##obj_name##_tag);                               \
    /* Unwrap object to get native instance */                                 \
    class_name *instance_name = class_name::Unwrap(wrapped);

#define BLST_TS_SERIALIZE_POINT(macro_name, class_name)                        \
    Napi::Env env = info.Env();                                                \
    Napi::EscapableHandleScope scope(env);                                     \
                                                                               \
    bool compressed{true};                                                     \
    if (!info[0].IsUndefined()) {                                              \
        compressed = info[0].ToBoolean().Value();                              \
    }                                                                          \
    Napi::Buffer<uint8_t> serialized = Napi::Buffer<uint8_t>::New(             \
        env,                                                                   \
        compressed ? BLST_TS_##macro_name##_LENGTH_COMPRESSED                  \
                   : BLST_TS_##macro_name##_LENGTH_UNCOMPRESSED);              \
                                                                               \
    if (_has_jacobian) {                                                       \
        compressed ? _jacobian->compress(serialized.Data())                    \
                   : _jacobian->serialize(serialized.Data());                  \
    } else if (_has_affine) {                                                  \
        compressed ? _affine->compress(serialized.Data())                      \
                   : _affine->serialize(serialized.Data());                    \
    } else {                                                                   \
        Napi::Error::New(                                                      \
            env, class_name " cannot be serialized. No point found!")          \
            .ThrowAsJavaScriptException();                                     \
        return scope.Escape(env.Undefined());                                  \
    }                                                                          \
                                                                               \
    return scope.Escape(serialized);

typedef enum { Affine, Jacobian } CoordType;

/**
 * Checks a byte array to see if it is all zeros. Can pass start byte for the
 * cases where the first byte is the tag (infinity point and
 * compress/uncompressed).
 *
 * @param data uint8_t*
 * @param start_byte size_t
 * @param byte_length size_t
 *
 * @return bool
 */
bool is_zero_bytes(
    const uint8_t *data, const size_t start_byte, const size_t byte_length);

/**
 * Checks if a byte array is a valid length. If not, sets the error message and
 * returns false.  If valid returns true for use in conditional statements.
 *
 * @param[out] error_out &std::string - error message to set if invalid
 * @param[in] byte_length size_t - length of the byte array to validate
 * @param[in] length1 size_t - first valid length
 * @param[in] length2 size_t - second valid length (optional)
 *
 * @return bool
 */
bool is_valid_length(
    std::string &error_out,
    size_t byte_length,
    size_t length1,
    size_t length2 = 0);

/**
 * BlstTsAddon is the main entry point for the library. It is responsible
 * for initialization and holding global values.
 */
class BlstTsAddon : public Napi::Addon<BlstTsAddon> {
   public:
    std::string _dst;
    std::string _blst_error_strings[8];
    Napi::FunctionReference _secret_key_ctr;
    napi_type_tag _secret_key_tag;
    Napi::FunctionReference _public_key_ctr;
    napi_type_tag _public_key_tag;
    Napi::FunctionReference _signature_ctr;
    napi_type_tag _signature_tag;

    /**
     * BlstTsAddon::BlstTsAddon constructor used by Node.js to create an
     * instance of the addon.
     *
     * @param env Napi::Env
     * @param exports Napi::Object
     *
     * @return BlstTsAddon
     *
     * @throws Napi::Error
     */
    BlstTsAddon(Napi::Env env, Napi::Object exports);

    /**
     * References are by default non-copyable and non-movable. This is just
     * to make it explicit that it's not allowed to be copied or moved.
     */
    BlstTsAddon(BlstTsAddon &&source) = delete;
    BlstTsAddon(const BlstTsAddon &source) = delete;
    BlstTsAddon &operator=(BlstTsAddon &&source) = delete;
    BlstTsAddon &operator=(const BlstTsAddon &source) = delete;

    /**
     * Converts a blst error to an error string
     */
    std::string GetBlstErrorString(const blst::BLST_ERROR &err);

    /**
     * Uses the same openssl method as node to generate random bytes
     */
    bool GetRandomBytes(blst::byte *ikm, size_t length);
};

class SecretKey : public Napi::ObjectWrap<SecretKey> {
   public:
    std::shared_ptr<blst::SecretKey> _key;
    bool _is_zero_key;

    static void Init(Napi::Env env, Napi::Object &exports, BlstTsAddon *module);
    static Napi::Value FromKeygen(const Napi::CallbackInfo &info);
    static Napi::Value Deserialize(const Napi::CallbackInfo &info);
    SecretKey(const Napi::CallbackInfo &info);
    Napi::Value Serialize(const Napi::CallbackInfo &info);
    Napi::Value ToPublicKey(const Napi::CallbackInfo &info);
    Napi::Value Sign(const Napi::CallbackInfo &info);
};

class PublicKey : public Napi::ObjectWrap<PublicKey> {
   public:
    bool _has_jacobian;
    bool _has_affine;
    std::shared_ptr<blst::P1> _jacobian;
    std::shared_ptr<blst::P1_Affine> _affine;

    static void Init(Napi::Env env, Napi::Object &exports, BlstTsAddon *module);
    static Napi::Value Deserialize(const Napi::CallbackInfo &info);
    PublicKey(const Napi::CallbackInfo &info);
    Napi::Value Serialize(const Napi::CallbackInfo &info);
    Napi::Value KeyValidate(const Napi::CallbackInfo &info);
};

class Signature : public Napi::ObjectWrap<Signature> {
   public:
    bool _has_jacobian;
    bool _has_affine;
    std::shared_ptr<blst::P2> _jacobian;
    std::shared_ptr<blst::P2_Affine> _affine;

    static void Init(Napi::Env env, Napi::Object &exports, BlstTsAddon *module);
    static Napi::Value Deserialize(const Napi::CallbackInfo &info);
    Signature(const Napi::CallbackInfo &info);
    Napi::Value Serialize(const Napi::CallbackInfo &info);
    Napi::Value SigValidate(const Napi::CallbackInfo &info);
};

/**
 * @note The unique_ptr is used to hold the blst::P* object if a Uint8Array is
 *       being converted instead of a PublicKey or Signature object.
 */
template <typename T>
struct PointerGroup {
    std::unique_ptr<T> unique_ptr = std::make_unique<T>();
    T *raw_pointer = nullptr;
};

/**
 *  Unwraps a Napi::Value to a blst::P* object. If the value is a Uint8Array it
 *  will be converted to a blst object. If the value is a PublicKey or
 *  Signature the pointer will be copied from the object and reused to avoid
 *  duplication.
 *
 * @param[out] ptr_group PointerGroup<T> &
 * @param[in] env const Napi::Env &
 * @param[in] module const BlstTsAddon *
 * @param[in] value const Napi::Value &
 * @param[in] js_class_name const std::string &
 * @param[in] coord_type CoordType
 *
 * @note This can potentially segfault if incorrect CoordType is passed. There
 *       is a C-style cast to get this to compile as the raw pointer is set from
 *       two different types depending on which branch of the conditional is
 *       taken by the code. This is safe as long as the CoordType is correct for
 *       the type of PointerGroup that is used.
 *
 * @note This can potentially throw a BLST_ERROR. Must be in try/catch but is
 *       not in this function so a loop counter from the calling context can be
 *       used in the error message
 */
template <typename T>
bool unwrap_point_arg(
    PointerGroup<T> &ptr_group,
    const Napi::Env &env,
    const BlstTsAddon *module,
    const Napi::Value &value,
    const std::string &js_class_name,
    CoordType coord_type) {
    if (value.IsTypedArray()) {
        Napi::TypedArray untyped = value.As<Napi::TypedArray>();
        if (untyped.TypedArrayType() != napi_uint8_array) {
            Napi::TypeError::New(env, js_class_name + " must be a BlstBuffer")
                .ThrowAsJavaScriptException();
            return true;
        }
        Napi::Uint8Array typed = untyped.As<Napi::Uint8Array>();

        std::string err_out{js_class_name};
        if (strcmp(js_class_name.c_str(), "PublicKeyArg") == 0) {
            if (!is_valid_length(
                    err_out,
                    typed.ByteLength(),
                    BLST_TS_PUBLIC_KEY_LENGTH_COMPRESSED,
                    BLST_TS_PUBLIC_KEY_LENGTH_UNCOMPRESSED)) {
                Napi::TypeError::New(env, err_out).ThrowAsJavaScriptException();
                return true;
            }
            if (is_zero_bytes(typed.Data(), 0, typed.ByteLength())) {
                Napi::TypeError::New(env, "PublicKeyArg must not be zero key")
                    .ThrowAsJavaScriptException();
                return true;
            }
        } else {
            if (!is_valid_length(
                    err_out,
                    typed.ByteLength(),
                    BLST_TS_SIGNATURE_LENGTH_COMPRESSED,
                    BLST_TS_SIGNATURE_LENGTH_UNCOMPRESSED)) {
                Napi::TypeError::New(env, err_out).ThrowAsJavaScriptException();
                return true;
            }
        }
        ptr_group.unique_ptr.reset(new T{typed.Data(), typed.ByteLength()});
        ptr_group.raw_pointer = ptr_group.unique_ptr.get();

        /* Arg is a deserialized point */
    } else if (value.IsObject()) {
        Napi::Object wrapped = value.As<Napi::Object>();

        if (strcmp(js_class_name.c_str(), "PublicKeyArg") == 0) {
            if (!wrapped.CheckTypeTag(&module->_public_key_tag)) {
                Napi::TypeError::New(env, "publicKey must be a PublicKeyArg")
                    .ThrowAsJavaScriptException();
                return true;
            }
            PublicKey *pk = PublicKey::Unwrap(wrapped);

            /* Check that the required point type has been created */
            if (coord_type == CoordType::Jacobian) {
                if (!pk->_has_jacobian) {
                    if (!pk->_has_affine) {
                        Napi::Error::New(env, "publicKey not initialized")
                            .ThrowAsJavaScriptException();
                        return true;
                    }
                    pk->_jacobian.reset(
                        new blst::P1{pk->_affine->to_jacobian()});
                    pk->_has_jacobian = true;
                }
                ptr_group.raw_pointer = (T *)pk->_jacobian.get();
            } else {
                if (!pk->_has_affine) {
                    if (!pk->_has_jacobian) {
                        Napi::Error::New(env, "publicKey not initialized")
                            .ThrowAsJavaScriptException();
                        return true;
                    }
                    pk->_affine.reset(
                        new blst::P1_Affine{pk->_jacobian->to_affine()});
                    pk->_has_affine = true;
                }
                ptr_group.raw_pointer = (T *)pk->_affine.get();
            }
        } else {
            if (!wrapped.CheckTypeTag(&module->_signature_tag)) {
                Napi::TypeError::New(env, "signature must be a SignatureArg")
                    .ThrowAsJavaScriptException();
                return true;
            }
            Signature *sig = Signature::Unwrap(wrapped);

            /* Check that the required point type has been created */
            if (coord_type == CoordType::Jacobian) {
                if (!sig->_has_jacobian) {
                    if (!sig->_has_affine) {
                        Napi::Error::New(env, "signature not initialized")
                            .ThrowAsJavaScriptException();
                        return true;
                    }
                    sig->_jacobian.reset(
                        new blst::P2{sig->_affine->to_jacobian()});
                    sig->_has_jacobian = true;
                }
                ptr_group.raw_pointer = (T *)sig->_jacobian.get();
            } else {
                if (!sig->_has_affine) {
                    if (!sig->_has_jacobian) {
                        Napi::Error::New(env, "signature not initialized")
                            .ThrowAsJavaScriptException();
                        return true;
                    }
                    sig->_affine.reset(
                        new blst::P2_Affine{sig->_jacobian->to_affine()});
                    sig->_has_affine = true;
                }
                ptr_group.raw_pointer = (T *)sig->_affine.get();
            }
        }
    } else {
        std::string err = strcmp(js_class_name.c_str(), "PublicKeyArg") == 0
                              ? "publicKey must be a PublicKeyArg"
                              : "signature must be a SignatureArg";
        Napi::TypeError::New(env, err).ThrowAsJavaScriptException();
        return true;
    }
    return false;
}

namespace Functions {
void Init(const Napi::Env &env, Napi::Object &exports);
}

#endif /* BLST_TS_ADDON_H__ */