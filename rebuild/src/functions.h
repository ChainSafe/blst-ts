#pragma once

#include "addon.h"
#include "blst.hpp"
#include "napi.h"

namespace functions {
void init(const Napi::Env &env, Napi::Object &exports);
}
