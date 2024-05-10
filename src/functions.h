#pragma once
#include "addon.h"

namespace blst_ts_functions {
/**
 * Unwraps a Napi::Value PublicKeyArg.  Can handle serialized Uint8Array and
 * deserialized PublicKey objects.  Throws JS error for invalid arguments and
 * can potentially throw native errors.  Should be wrapped in a try/catch
 *
 * @param pk_point  - Struct with native point information for use by blst
 * @param env       - Napi::Env
 * @param pk_val    - Napi::Value to be unwrapped into native point
 */
blst_ts::BLST_TS_ERROR unwrap_public_key(
    blst_ts::P1AffineGroup &pk_point,
    const Napi::Env &env,
    const Napi::Value &pk_val);

/**
 * Unwraps a Napi::Value SignatureArg.  Can handle serialized Uint8Array and
 * deserialized Signature objects.  Throws JS error for invalid arguments and
 * can potentially throw native errors.  Should be wrapped in a try/catch
 *
 * @param sig_point - Struct with native point information for use by blst
 * @param env       - Napi::Env
 * @param sig_val   - Napi::Value to be unwrapped into native point
 */
blst_ts::BLST_TS_ERROR unwrap_signature(
    blst_ts::P2AffineGroup &sig_point,
    const Napi::Env &env,
    const Napi::Value &sig_val);
}  // namespace blst_ts_functions
