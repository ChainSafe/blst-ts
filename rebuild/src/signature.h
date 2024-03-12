#pragma once

#include <memory>

#include "addon.h"
#include "blst.hpp"
#include "napi.h"

#define BLST_TS_SIGNATURE_LENGTH_COMPRESSED 96U
#define BLST_TS_SIGNATURE_LENGTH_UNCOMPRESSED 192U

typedef struct {
    std::unique_ptr<blst::P2_Affine> smart_pointer;
    blst::P2_Affine *raw_point;
} P2AffineGroup;

class P2Wrapper {
   public:
    virtual ~P2Wrapper() = default;
    virtual bool IsInfinite() const = 0;
    virtual bool InGroup() const = 0;
    virtual void Serialize(bool compress, blst::byte *out) const = 0;
    virtual void AddTo(blst::P2 &point) const = 0;
    virtual blst::P2 MultiplyBy(
        const blst::byte *rand_bytes, const size_t rand_bytes_length) const = 0;
    virtual P2AffineGroup AsAffine() = 0;
    virtual void Sign(
        const blst::SecretKey &key,
        const uint8_t *msg,
        const size_t msg_length,
        const std::string &dst) = 0;
};

class P2 : public P2Wrapper {
   private:
    blst::P2 _point;

   public:
    P2(blst::P2 point) : _point(std::move(point)) {}
    bool IsInfinite() const final { return _point.is_inf(); }
    bool InGroup() const final { return _point.in_group(); }
    void Serialize(bool compress, blst::byte *out) const final {
        compress ? _point.compress(out) : _point.serialize(out);
    }
    void AddTo(blst::P2 &point) const final { point.add(_point); };
    blst::P2 MultiplyBy(
        const blst::byte *rand_bytes,
        const size_t rand_bytes_length) const final {
        blst::byte out[BLST_TS_SIGNATURE_LENGTH_UNCOMPRESSED];
        _point.serialize(out);
        // this should get std::move all the way into the P2 member value
        blst::P2 point{out, BLST_TS_SIGNATURE_LENGTH_UNCOMPRESSED};
        point.mult(rand_bytes, rand_bytes_length);
        return point;
    };
    P2AffineGroup AsAffine() final {
        P2AffineGroup group{std::make_unique<blst::P2_Affine>(_point), nullptr};
        group.raw_point = group.smart_pointer.get();
        return group;
    };
    void Sign(
        const blst::SecretKey &key,
        const uint8_t *msg,
        const size_t msg_length,
        const std::string &dst) final {
        _point.hash_to(msg, msg_length, dst);
        _point.sign_with(key);
    };
};

class P2Affine : public P2Wrapper {
   private:
    blst::P2_Affine _point;

   public:
    P2Affine(blst::P2_Affine point) : _point(std::move(point)) {}
    bool IsInfinite() const final { return _point.is_inf(); }
    bool InGroup() const final { return _point.in_group(); }
    void Serialize(bool compress, blst::byte *out) const final {
        compress ? _point.compress(out) : _point.serialize(out);
    }
    void AddTo(blst::P2 &point) const final { point.add(_point); };
    blst::P2 MultiplyBy(
        const blst::byte *rand_bytes,
        const size_t rand_bytes_length) const final {
        blst::byte out[BLST_TS_SIGNATURE_LENGTH_UNCOMPRESSED];
        _point.serialize(out);
        // this should get std::move all the way into the P2 member value
        blst::P2 point{out, BLST_TS_SIGNATURE_LENGTH_UNCOMPRESSED};
        point.mult(rand_bytes, rand_bytes_length);
        return point;
    };
    P2AffineGroup AsAffine() final {
        P2AffineGroup group{nullptr, &_point};
        return group;
    }
    void Sign(
        const blst::SecretKey &key,
        const uint8_t *msg,
        const size_t msg_length,
        const std::string &dst) final {
        blst::P2 jacobian{_point};
        jacobian.hash_to(msg, msg_length, dst);
        jacobian.sign_with(key);
        _point = jacobian.to_affine();
    };
};

class Signature : public Napi::ObjectWrap<Signature> {
   public:
    std::unique_ptr<P2Wrapper> _point;

    static void Init(Napi::Env env, Napi::Object &exports, BlstTsAddon *module);
    static Napi::Value Deserialize(const Napi::CallbackInfo &info);
    Signature(const Napi::CallbackInfo &info);
    Napi::Value Serialize(const Napi::CallbackInfo &info);
    Napi::Value SigValidate(const Napi::CallbackInfo &info);
    Napi::Value IsInfinity(const Napi::CallbackInfo &info);
    Napi::Value MultiplyBy(const Napi::CallbackInfo &info);
};
