#include "addon.h"

namespace blst_ts {
/**
 * Checks if a specified range of bytes within a byte array consists only of
 * zeros.
 *
 * @param data A pointer to the first element of the byte array to be checked.
 * @param starting_index The offset (index) from the beginning of the array
 * where the check should start. (0 starts at *data)
 * @param byte_length The total length of the data array
 *
 * @return Returns true if all bytes from start_byte to the end of the array are
 * zeros. Returns false if the starting offset is beyond the array length or if
 * any byte in the specified range is not zero.
 */
bool is_zero_bytes(
    const uint8_t *data,
    const size_t starting_index,
    const size_t byte_length) noexcept {
    if (starting_index < byte_length) {
        return std::all_of(
            data + starting_index, data + byte_length, [](uint8_t x) {
                return x == 0x00;
            });
    }
    return false;
}

/**
 * Validates that a given byte length matches one of two specified lengths,
 * optionally recording an error message if the validation fails.
 *
 * @param error_out A reference to a std::string where the error message is
 * appended if the byte length does not match either length1 or length2.
 * @param byte_length The length to be validated against length1 and length2.
 * @param length1 The first valid length that byte_length can be. A value of 0
 * is considered as not set and thus not compared.
 * @param length2 The second valid length that byte_length can be. A value of 0
 * is considered as not set and thus not compared.
 *
 * @return Returns true if byte_length matches length1 or (if length2 is not 0)
 * length2. Returns false if byte_length matches neither, appending an
 * appropriate error message to error_out.
 *
 * @note If both length1 and length2 are provided (non-zero), the error message
 * will indicate that the valid byte_length must be either length1 or length2.
 * If only one length is provided (the other being 0), the error message will
 * only reference the provided length.
 */
[[nodiscard]] std::optional<std::string> is_valid_length(
    size_t byte_length, size_t length1, size_t length2) noexcept {
    if (byte_length == length1 || (length2 != 0 && byte_length == length2)) {
        return std::nullopt;
    }
    std::string err_msg{" must be "};
    if (length1 != 0) {
        err_msg.append(std::to_string(length1));
    };
    if (length2 != 0) {
        if (length1 != 0) {
            err_msg.append(" or ");
        }
        err_msg.append(std::to_string(length2));
    };
    err_msg.append(" bytes long");
    return err_msg;
}
}  // namespace blst_ts

BlstTsAddon::BlstTsAddon(Napi::Env env, Napi::Object exports)
    : _blst_error_strings{
        "BLST_SUCCESS",
        "BLST_ERROR::BLST_BAD_ENCODING",
        "BLST_ERROR::BLST_POINT_NOT_ON_CURVE",
        "BLST_ERROR::BLST_POINT_NOT_IN_GROUP",
        "BLST_ERROR::BLST_AGGR_TYPE_MISMATCH",
        "BLST_ERROR::BLST_VERIFY_FAIL",
        "BLST_ERROR::BLST_PK_IS_INFINITY",
        "BLST_ERROR::BLST_BAD_SCALAR",
    },
    dst{"BLS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_POP_"} {
    Napi::Object js_constants = Napi::Object::New(env);
    js_constants.Set(
        Napi::String::New(env, "DST"), Napi::String::New(env, dst));
    DefineAddon(
        exports,
        {
            InstanceValue("BLST_CONSTANTS", js_constants, napi_enumerable),
        });
    blst_ts::SecretKey::Init(env, exports, this);
    blst_ts::PublicKey::Init(env, exports, this);
    blst_ts::Signature::Init(env, exports, this);
    blst_ts_functions::init(env, exports);
    env.SetInstanceData(this);

    // Check that openssl PRNG is seeded
    blst::byte seed{0};
    if (!this->GetRandomBytes(&seed, 0)) {
        Napi::Error::New(
            env, "BLST_ERROR: Error seeding pseudo-random number generator")
            .ThrowAsJavaScriptException();
    }
}

std::string BlstTsAddon::GetBlstErrorString(const blst::BLST_ERROR &err) {
    size_t err_index = static_cast<size_t>(err);
    // size of total array divided by size of one element minus 1 for 0 index
    // basis
    size_t max_index =
        sizeof(_blst_error_strings) / sizeof(_blst_error_strings[0]) - 1;
    if (err_index > max_index) {
        return "BLST_ERROR::UNKNOWN_ERROR_CODE";
    }
    return _blst_error_strings[err];
}

bool BlstTsAddon::GetRandomBytes(blst::byte *bytes, size_t length) {
    // [randomBytes](https://github.com/nodejs/node/blob/4166d40d0873b6d8a0c7291872c8d20dc680b1d7/lib/internal/crypto/random.js#L98)
    // [RandomBytesJob](https://github.com/nodejs/node/blob/4166d40d0873b6d8a0c7291872c8d20dc680b1d7/lib/internal/crypto/random.js#L139)
    // [RandomBytesTraits::DeriveBits](https://github.com/nodejs/node/blob/4166d40d0873b6d8a0c7291872c8d20dc680b1d7/src/crypto/crypto_random.cc#L65)
    // [CSPRNG](https://github.com/nodejs/node/blob/4166d40d0873b6d8a0c7291872c8d20dc680b1d7/src/crypto/crypto_util.cc#L63)
    do {
        if ((1 == RAND_status()) && (1 == RAND_bytes(bytes, length))) {
            return true;
        }
    } while (1 == RAND_poll());

    return false;
}

NODE_API_ADDON(BlstTsAddon)
