#pragma once

#include "addon.h"
#include "blst.hpp"
#include "napi.h"

namespace Functions {
void Init(const Napi::Env &env, Napi::Object &exports);
}
