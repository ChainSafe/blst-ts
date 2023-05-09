#ifndef BLST_TS_FUNCTIONS_H__
#define BLST_TS_FUNCTIONS_H__

#include <sstream>
#include <vector>
#include <memory>
#include "napi.h"
#include "blst.hpp"
#include "addon.h"
#include "public_key.h"
#include "signature.h"

namespace
{
    class SignatureSet : public BlstBase
    {
    public:
        Uint8ArrayArg _msg;
        PublicKeyArg _publicKey;
        SignatureArg _signature;

        SignatureSet(Napi::Env env, const Napi::Value &raw_arg);

        // non-copyable. Should only be created directly in
        // SignatureSetArray via copy elision
        SignatureSet(const SignatureSet &source) = delete;
        SignatureSet(SignatureSet &&source) = default;
        SignatureSet &operator=(const SignatureSet &source) = delete;
        SignatureSet &operator=(SignatureSet &&source) = default;
    };

    class SignatureSetArray : public BlstBase
    {
    public:
        std::vector<SignatureSet> _sets;

        SignatureSetArray(Napi::Env env, const Napi::Value &raw_arg);

        // immovable/non-copyable. should only be created directly as class member
        SignatureSetArray(const SignatureSetArray &source) = delete;
        SignatureSetArray(SignatureSetArray &&source) = delete;
        SignatureSetArray &operator=(const SignatureSetArray &source) = delete;
        SignatureSetArray &operator=(SignatureSetArray &&source) = delete;

        SignatureSet &operator[](size_t index) { return _sets[index]; }

        size_t Size() { return _sets.size(); }
    };
} // namespace (anonymous)

namespace Functions
{
    void Init(const Napi::Env &env, Napi::Object &exports);
}

#endif /* BLST_TS_FUNCTIONS_H__ */
