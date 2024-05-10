#pragma once
#include "addon.h"

namespace blst_ts_functions {
blst_ts::BLST_TS_ERROR unwrap_public_key(
    blst_ts::P1AffineGroup &pk_point,
    const Napi::Env &env,
    const Napi::Value &pk_val);

blst_ts::BLST_TS_ERROR unwrap_signature(
    blst_ts::P2AffineGroup &sig_point,
    const Napi::Env &env,
    const Napi::Value &sig_val);
}  // namespace blst_ts_functions
