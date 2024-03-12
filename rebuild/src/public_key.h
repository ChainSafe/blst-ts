#pragma once

#include <memory>

#include "addon.h"
#include "blst.hpp"
#include "napi.h"

static const size_t public_key_length_compressed = 48;
static const size_t public_key_length_uncompressed = 96;

typedef struct {
    std::unique_ptr<blst::P1_Affine> smart_pointer;
    blst::P1_Affine *raw_point;
} P1AffineGroup;

class P1Wrapper {
   public:
    virtual ~P1Wrapper() = default;
    virtual bool IsInfinite() const = 0;
    virtual bool InGroup() const = 0;
    virtual void Serialize(bool compress, blst::byte *out) const = 0;
    virtual void AddTo(blst::P1 &point) const = 0;
    virtual blst::P1 MultiplyBy(
        const blst::byte *rand_bytes, const size_t rand_bytes_length) const = 0;
    virtual P1AffineGroup AsAffine() = 0;
};

class P1 : public P1Wrapper {
   private:
    blst::P1 _point;

   public:
    P1(blst::P1 point) : _point(std::move(point)) {}
    bool IsInfinite() const final { return _point.is_inf(); }
    bool InGroup() const final { return _point.in_group(); }
    void Serialize(bool compress, blst::byte *out) const final {
        compress ? _point.compress(out) : _point.serialize(out);
    }
    void AddTo(blst::P1 &point) const final { point.add(_point); };
    blst::P1 MultiplyBy(
        const blst::byte *rand_bytes,
        const size_t rand_bytes_length) const final {
        blst::byte out[public_key_length_uncompressed];
        _point.serialize(out);
        // this should get std::move all the way into the P1 member value
        blst::P1 point{out, public_key_length_uncompressed};
        point.mult(rand_bytes, rand_bytes_length);
        return point;
    };
    P1AffineGroup AsAffine() final {
        P1AffineGroup group{std::make_unique<blst::P1_Affine>(_point), nullptr};
        group.raw_point = group.smart_pointer.get();
        return group;
    };
};

class P1Affine : public P1Wrapper {
   private:
    blst::P1_Affine _point;

   public:
    P1Affine(blst::P1_Affine point) : _point(std::move(point)) {}
    bool IsInfinite() const final { return _point.is_inf(); }
    bool InGroup() const final { return _point.in_group(); }
    void Serialize(bool compress, blst::byte *out) const final {
        compress ? _point.compress(out) : _point.serialize(out);
    }
    void AddTo(blst::P1 &point) const final { point.add(_point); };
    blst::P1 MultiplyBy(
        const blst::byte *rand_bytes,
        const size_t rand_bytes_length) const final {
        blst::byte out[public_key_length_uncompressed];
        _point.serialize(out);
        // this should get std::move all the way into the P1 member value
        blst::P1 point{out, public_key_length_uncompressed};
        point.mult(rand_bytes, rand_bytes_length);
        return point;
    };
    P1AffineGroup AsAffine() final {
        P1AffineGroup group{nullptr, &_point};
        return group;
    }
};

class PublicKey : public Napi::ObjectWrap<PublicKey> {
   public:
    std::unique_ptr<P1Wrapper> point;

    static void Init(Napi::Env env, Napi::Object &exports, BlstTsAddon *module);
    static Napi::Value Deserialize(const Napi::CallbackInfo &info);
    PublicKey(const Napi::CallbackInfo &info);
    Napi::Value Serialize(const Napi::CallbackInfo &info);
    Napi::Value KeyValidate(const Napi::CallbackInfo &info);
    Napi::Value IsInfinity(const Napi::CallbackInfo &info);
    Napi::Value MultiplyBy(const Napi::CallbackInfo &info);
};
