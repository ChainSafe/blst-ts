
#include <emscripten.h>

extern "C" {

// TODO:
// const P1_SIZE_SERIALIZED = 96;
// const P2_SIZE_SERIALIZED = 192;
// const P1_SIZE_COMPRESSED = 48;
// const P2_SIZE_COMPRESSED = 96;
// ...

// Not using size_t for array indices as the values used by the javascript code are signed.

EM_JS(void, array_bounds_check_error, (size_t idx, size_t size), {
  throw 'Array index ' + idx + ' out of bounds: [0,' + size + ')';
});

void array_bounds_check(const int array_size, const int array_idx) {
  if (array_idx < 0 || array_idx >= array_size) {
    array_bounds_check_error(array_idx, array_size);
  }
}

// VoidPtr

void EMSCRIPTEN_KEEPALIVE emscripten_bind_VoidPtr___destroy___0(void** self) {
  delete self;
}

// P1_Affine

blst::P1_Affine* EMSCRIPTEN_KEEPALIVE emscripten_bind_P1_Affine_P1_Affine_0() {
  return new blst::P1_Affine();
}

blst::P1_Affine* EMSCRIPTEN_KEEPALIVE emscripten_bind_P1_Affine_P1_Affine_1(const blst::P1* input) {
  return new blst::P1_Affine(*input);
}

blst::P1_Affine* EMSCRIPTEN_KEEPALIVE emscripten_bind_P1_Affine_P1_Affine_2(const blst::byte* input, long len) {
  return new blst::P1_Affine(input, len);
}

blst::P1_Affine* EMSCRIPTEN_KEEPALIVE emscripten_bind_P1_Affine_dup_0(blst::P1_Affine* self) {
  return new blst::P1_Affine(self->dup());
}

blst::P1* EMSCRIPTEN_KEEPALIVE emscripten_bind_P1_Affine_to_jacobian_0(blst::P1_Affine* self) {
  return new blst::P1(self->to_jacobian());
}

void EMSCRIPTEN_KEEPALIVE emscripten_bind_P1_Affine_serialize_1(blst::P1_Affine* self, blst::byte* out) {
  blst::byte _out[96];
  self->serialize(_out);
  for (int i = 0; i < 96; i++) {
    out[i] = _out[i];
  }
}

void EMSCRIPTEN_KEEPALIVE emscripten_bind_P1_Affine_compress_1(blst::P1_Affine* self, blst::byte* out) {
  blst::byte _out[48];
  self->compress(_out);
  for (int i = 0; i < 48; i++) {
    out[i] = _out[i];
  }
}

bool EMSCRIPTEN_KEEPALIVE emscripten_bind_P1_Affine_on_curve_0(blst::P1_Affine* self) {
  return self->on_curve();
}

bool EMSCRIPTEN_KEEPALIVE emscripten_bind_P1_Affine_in_group_0(blst::P1_Affine* self) {
  return self->in_group();
}

bool EMSCRIPTEN_KEEPALIVE emscripten_bind_P1_Affine_is_inf_0(blst::P1_Affine* self) {
  return self->is_inf();
}

bool EMSCRIPTEN_KEEPALIVE emscripten_bind_P1_Affine_is_equal_1(blst::P1_Affine* self, blst::P1_Affine* p) {
  return self->is_equal(*p);
}

long EMSCRIPTEN_KEEPALIVE emscripten_bind_P1_Affine_core_verify_7(blst::P1_Affine* self, const blst::P2_Affine* pk, bool hash_or_encode, const blst::byte* msg, long msg_len, const char* DST, const blst::byte* aug, long aug_len) {
return self->core_verify(*pk, hash_or_encode, msg, msg_len, DST, aug, aug_len);
}

void EMSCRIPTEN_KEEPALIVE emscripten_bind_P1_Affine___destroy___0(blst::P1_Affine* self) {
  delete self;
}

// P1

blst::P1* EMSCRIPTEN_KEEPALIVE emscripten_bind_P1_P1_0() {
  return new blst::P1();
}

blst::P1* EMSCRIPTEN_KEEPALIVE emscripten_bind_P1_P1_1(const blst::SecretKey* input) {
  return new blst::P1(*input);
}

blst::P1* EMSCRIPTEN_KEEPALIVE emscripten_bind_P1_P1_2(const blst::byte* input, long len) {
  return new blst::P1(input, len);
}

blst::P1* EMSCRIPTEN_KEEPALIVE emscripten_bind_P1_P1_generator_0() {
  return new blst::P1(blst::P1::generator());
}

blst::P1* EMSCRIPTEN_KEEPALIVE emscripten_bind_P1_dup_0(blst::P1* self) {
  return new blst::P1(self->dup());
}

blst::P1_Affine* EMSCRIPTEN_KEEPALIVE emscripten_bind_P1_to_affine_0(blst::P1* self) {
  return new blst::P1_Affine(self->to_affine());
}

void EMSCRIPTEN_KEEPALIVE emscripten_bind_P1_serialize_1(blst::P1* self, blst::byte* out) {
  blst::byte _out[96];
  self->serialize(_out);
  for (int i = 0; i < 96; i++) {
    out[i] = _out[i];
  }
}

void EMSCRIPTEN_KEEPALIVE emscripten_bind_P1_compress_1(blst::P1* self, blst::byte* out) {
  blst::byte _out[48];
  self->compress(_out);
  for (int i = 0; i < 48; i++) {
    out[i] = _out[i];
  }
}

bool EMSCRIPTEN_KEEPALIVE emscripten_bind_P1_on_curve_0(blst::P1* self) {
  return self->on_curve();
}

bool EMSCRIPTEN_KEEPALIVE emscripten_bind_P1_in_group_0(blst::P1* self) {
  return self->in_group();
}

bool EMSCRIPTEN_KEEPALIVE emscripten_bind_P1_is_inf_0(blst::P1* self) {
  return self->is_inf();
}

bool EMSCRIPTEN_KEEPALIVE emscripten_bind_P1_is_equal_1(blst::P1* self, const blst::P1* p) {
  return self->is_equal(*p);
}

void EMSCRIPTEN_KEEPALIVE emscripten_bind_P1_aggregate_1(blst::P1* self, const blst::P1_Affine* input) {
  self->aggregate(*input);
}

blst::P1* EMSCRIPTEN_KEEPALIVE emscripten_bind_P1_sign_with_1(blst::P1* self, const blst::SecretKey* sk) {
  return self->sign_with(*sk);
}
blst::P1* EMSCRIPTEN_KEEPALIVE emscripten_bind_P1_hash_to_5(blst::P1* self, const blst::byte* msg, long msg_len, const char* DST, const blst::byte *aug, long aug_len) {
  const std::string _dst(DST);
  return self->hash_to(msg, msg_len, _dst, aug, aug_len);
}

blst::P1* EMSCRIPTEN_KEEPALIVE emscripten_bind_P1_encode_to_5(blst::P1* self, const blst::byte* msg, long msg_len, const char* DST, const blst::byte *aug, long aug_len) {
  const std::string _dst(DST);
  return self->encode_to(msg, msg_len, _dst, aug, aug_len);
}

blst::P1* EMSCRIPTEN_KEEPALIVE emscripten_bind_P1_mult_1(blst::P1* self, blst::byte* scalar, long scalar_len_bits) {
  return self->mult(scalar, scalar_len_bits);
}

blst::P1* EMSCRIPTEN_KEEPALIVE emscripten_bind_P1_neg_0(blst::P1* self) {
  return self->cneg(true);
}

blst::P1* EMSCRIPTEN_KEEPALIVE emscripten_bind_P1_cneg_1(blst::P1* self, bool flag) {
  return self->cneg(flag);
}

blst::P1* EMSCRIPTEN_KEEPALIVE emscripten_bind_P1_add_1__P1(blst::P1* self, blst::P1* a) {
  return self->add(*a);
}

blst::P1* EMSCRIPTEN_KEEPALIVE emscripten_bind_P1_add_1__P1_Affine(blst::P1* self, blst::P1_Affine* a) {
  return self->add(*a);
}

blst::P1* EMSCRIPTEN_KEEPALIVE emscripten_bind_P1_dbl_0(blst::P1* self) {
  return self->dbl();
}

void EMSCRIPTEN_KEEPALIVE emscripten_bind_P1___destroy___0(blst::P1* self) {
  delete self;
}

// P2_Affine

blst::P2_Affine* EMSCRIPTEN_KEEPALIVE emscripten_bind_P2_Affine_P2_Affine_0() {
  return new blst::P2_Affine();
}

blst::P2_Affine* EMSCRIPTEN_KEEPALIVE emscripten_bind_P2_Affine_P2_Affine_1(const blst::P2* input) {
  return new blst::P2_Affine(*input);
}

blst::P2_Affine* EMSCRIPTEN_KEEPALIVE emscripten_bind_P2_Affine_P2_Affine_2(const blst::byte* input, long len) {
  return new blst::P2_Affine(input, len);
}

blst::P2_Affine* EMSCRIPTEN_KEEPALIVE emscripten_bind_P2_Affine_dup_0(blst::P2_Affine* self) {
  return new blst::P2_Affine(self->dup());
}

blst::P2* EMSCRIPTEN_KEEPALIVE emscripten_bind_P2_Affine_to_jacobian_0(blst::P2_Affine* self) {
  return new blst::P2(self->to_jacobian());
}

void EMSCRIPTEN_KEEPALIVE emscripten_bind_P2_Affine_serialize_1(blst::P2_Affine* self, blst::byte* out) {
  blst::byte _out[192];
  self->serialize(_out);
  for (int i = 0; i < 192; i++) {
    out[i] = _out[i];
  }
}

void EMSCRIPTEN_KEEPALIVE emscripten_bind_P2_Affine_compress_1(blst::P2_Affine* self, blst::byte* out) {
  blst::byte _out[96];
  self->compress(_out);
  for (int i = 0; i < 96; i++) {
    out[i] = _out[i];
  }
}

bool EMSCRIPTEN_KEEPALIVE emscripten_bind_P2_Affine_on_curve_0(blst::P2_Affine* self) {
  return self->on_curve();
}

bool EMSCRIPTEN_KEEPALIVE emscripten_bind_P2_Affine_in_group_0(blst::P2_Affine* self) {
  return self->in_group();
}

bool EMSCRIPTEN_KEEPALIVE emscripten_bind_P2_Affine_is_inf_0(blst::P2_Affine* self) {
  return self->is_inf();
}

bool EMSCRIPTEN_KEEPALIVE emscripten_bind_P2_Affine_is_equal_1(blst::P2_Affine* self, blst::P2_Affine* p) {
  return self->is_equal(*p);
}

long EMSCRIPTEN_KEEPALIVE emscripten_bind_P2_Affine_core_verify_7(blst::P2_Affine* self, const blst::P1_Affine* pk, bool hash_or_encode, const char* msg, long msg_len, const char* DST, const char* aug, long aug_len) {
  return self->core_verify(*pk, hash_or_encode, (const blst::byte *) msg, msg_len, DST, (const blst::byte *) aug, aug_len);
}

void EMSCRIPTEN_KEEPALIVE emscripten_bind_P2_Affine___destroy___0(blst::P2_Affine* self) {
  delete self;
}

// P2

blst::P2* EMSCRIPTEN_KEEPALIVE emscripten_bind_P2_P2_0() {
  return new blst::P2();
}

blst::P2* EMSCRIPTEN_KEEPALIVE emscripten_bind_P2_P2_1(const blst::SecretKey* input) {
  return new blst::P2(*input);
}

blst::P2* EMSCRIPTEN_KEEPALIVE emscripten_bind_P2_P2_2(const blst::byte* input, long len) {
  return new blst::P2(input, len);
}

blst::P2* EMSCRIPTEN_KEEPALIVE emscripten_bind_P2_P2_generator_0() {
  return new blst::P2(blst::P2::generator());
}

blst::P2* EMSCRIPTEN_KEEPALIVE emscripten_bind_P2_dup_0(blst::P2* self) {
  return new blst::P2(self->dup());
}

blst::P2_Affine* EMSCRIPTEN_KEEPALIVE emscripten_bind_P2_to_affine_0(blst::P2* self) {
  return new blst::P2_Affine(self->to_affine());
}

void EMSCRIPTEN_KEEPALIVE emscripten_bind_P2_serialize_1(blst::P2* self, blst::byte* out) {
  blst::byte _out[192];
  self->serialize(_out);
  for (int i = 0; i < 192; i++) {
    out[i] = _out[i];
  }
}

void EMSCRIPTEN_KEEPALIVE emscripten_bind_P2_compress_1(blst::P2* self, blst::byte* out) {
  blst::byte _out[96];
  self->compress(_out);
  for (int i = 0; i < 96; i++) {
    out[i] = _out[i];
  }
}

bool EMSCRIPTEN_KEEPALIVE emscripten_bind_P2_on_curve_0(blst::P2* self) {
  return self->on_curve();
}

bool EMSCRIPTEN_KEEPALIVE emscripten_bind_P2_in_group_0(blst::P2* self) {
  return self->in_group();
}

bool EMSCRIPTEN_KEEPALIVE emscripten_bind_P2_is_inf_0(blst::P2* self) {
  return self->is_inf();
}

bool EMSCRIPTEN_KEEPALIVE emscripten_bind_P2_is_equal_1(blst::P2* self, const blst::P2* p) {
  return self->is_equal(*p);
}

void EMSCRIPTEN_KEEPALIVE emscripten_bind_P2_aggregate_1(blst::P2* self, const blst::P2_Affine* input) {
  self->aggregate(*input);
}

blst::P2* EMSCRIPTEN_KEEPALIVE emscripten_bind_P2_sign_with_1(blst::P2* self, const blst::Scalar* scalar) {
  return self->sign_with(*scalar);
}

blst::P2* EMSCRIPTEN_KEEPALIVE emscripten_bind_P2_hash_to_5(blst::P2* self, const blst::byte* msg, long msg_len, const char* DST, const blst::byte* aug, long aug_len) {
  const std::string _dst(DST);
  return self->hash_to(msg, msg_len, _dst, aug, aug_len);
}

blst::P2* EMSCRIPTEN_KEEPALIVE emscripten_bind_P2_encode_to_5(blst::P2* self, const blst::byte* msg, long msg_len, const char* DST, const blst::byte* aug, long aug_len) {
  const std::string _dst(DST);
  return self->encode_to(msg, msg_len, _dst, aug, aug_len);
}

blst::P2* EMSCRIPTEN_KEEPALIVE emscripten_bind_P2_mult_1(blst::P2* self, blst::byte* scalar, long scalar_len_bits) {
  return self->mult(scalar, scalar_len_bits);
}

blst::P2* EMSCRIPTEN_KEEPALIVE emscripten_bind_P2_neg_0(blst::P2* self) {
  return self->neg();
}

blst::P2* EMSCRIPTEN_KEEPALIVE emscripten_bind_P2_cneg_1(blst::P2* self, bool flag) {
  return self->cneg(flag);
}

blst::P2* EMSCRIPTEN_KEEPALIVE emscripten_bind_P2_add_1__P2(blst::P2* self, blst::P2* a) {
  return self->add(*a);
}

blst::P2* EMSCRIPTEN_KEEPALIVE emscripten_bind_P2_add_1__P2_Affine(blst::P2* self, blst::P2_Affine* a) {
  return self->add(*a);
}

blst::P2* EMSCRIPTEN_KEEPALIVE emscripten_bind_P2_dbl_0(blst::P2* self) {
  return self->dbl();
}

void EMSCRIPTEN_KEEPALIVE emscripten_bind_P2___destroy___0(blst::P2* self) {
  delete self;
}

// SecretKey

blst::SecretKey* EMSCRIPTEN_KEEPALIVE emscripten_bind_SecretKey_SecretKey_0() {
  return new blst::SecretKey();
}

void EMSCRIPTEN_KEEPALIVE emscripten_bind_SecretKey_keygen_3(blst::SecretKey* self, const blst::byte* ikm, long ikm_len, const char* info) {
  self->keygen(ikm, ikm_len, info);
}

void EMSCRIPTEN_KEEPALIVE emscripten_bind_SecretKey_from_bendian_1(blst::SecretKey* self, const blst::byte* input) {
  blst::byte _in[32];
  for (int i = 0; i < 32; i++) {
    _in[i] = input[i];
  }
  self->from_bendian(_in);
}

void EMSCRIPTEN_KEEPALIVE emscripten_bind_SecretKey_from_lendian_1(blst::SecretKey* self, blst::byte* input) {
  blst::byte _in[32];
  for (int i = 0; i < 32; i++) {
    _in[i] = input[i];
  }
  self->from_lendian(_in);
}

void EMSCRIPTEN_KEEPALIVE emscripten_bind_SecretKey_to_bendian_1(blst::SecretKey* self, blst::byte* out) {
  blst::byte _out[32];
  self->to_bendian(_out);
  for (int i = 0; i < 32; i++) {
    out[i] = _out[i];
  }
}

void EMSCRIPTEN_KEEPALIVE emscripten_bind_SecretKey_to_lendian_1(blst::SecretKey* self, blst::byte* out) {
  blst::byte _out[32];
  self->to_lendian(_out);
  for (int i = 0; i < 32; i++) {
    out[i] = _out[i];
  }
}

void EMSCRIPTEN_KEEPALIVE emscripten_bind_SecretKey___destroy___0(blst::SecretKey* self) {
  delete self;
}

// PT

blst::PT* EMSCRIPTEN_KEEPALIVE emscripten_bind_PT_PT__P1_Affine_1(const blst::P1_Affine* p) {
  return new blst::PT(*p);
}

blst::PT* EMSCRIPTEN_KEEPALIVE emscripten_bind_PT_PT__P2_Affine_1(const blst::P2_Affine* p) {
  return new blst::PT(*p);
}

blst::PT* EMSCRIPTEN_KEEPALIVE emscripten_bind_PT_PT_2(const blst::P1_Affine* p, const blst::P2_Affine* q) {
  return new blst::PT(*p, *q);
}

blst::PT* EMSCRIPTEN_KEEPALIVE emscripten_bind_PT_dup_0(blst::PT* self) {
  return new blst::PT(self->dup());
}

bool EMSCRIPTEN_KEEPALIVE emscripten_bind_PT_is_one_0(blst::PT* self) {
  return self->is_one();
}

bool EMSCRIPTEN_KEEPALIVE emscripten_bind_PT_is_equal_1(blst::PT* self, const blst::PT* p) {
  return self->is_equal(*p);
}

blst::PT* EMSCRIPTEN_KEEPALIVE emscripten_bind_PT_sqr_0(blst::PT* self) {
  return self->sqr();
}

blst::PT* EMSCRIPTEN_KEEPALIVE emscripten_bind_PT_mul_1(blst::PT* self, const blst::PT* p) {
  return self->mul(*p);
}

blst::PT* EMSCRIPTEN_KEEPALIVE emscripten_bind_PT_final_exp_0(blst::PT* self) {
  return self->final_exp();
}

bool EMSCRIPTEN_KEEPALIVE emscripten_bind_PT_in_group_0(blst::PT* self) {
  return self->in_group();
}

bool EMSCRIPTEN_KEEPALIVE emscripten_bind_PT_finalverify_2(blst::PT* self, const blst::PT* gt1, const blst::PT* gt2) {
  return self->finalverify(*gt1, *gt2);
}

blst::PT* EMSCRIPTEN_KEEPALIVE emscripten_bind_PT_one_0(blst::PT* self) {
  blst::PT *one = new blst::PT(self->one());
  return one;
}

void EMSCRIPTEN_KEEPALIVE emscripten_bind_PT___destroy___0(blst::PT* self) {
  delete self;
}

// Pairing

blst::Pairing* EMSCRIPTEN_KEEPALIVE emscripten_bind_Pairing_Pairing_3(bool hash_or_encode, const blst::byte* DST, long DST_len) {
  return new blst::Pairing(hash_or_encode, DST, DST_len);
}

long EMSCRIPTEN_KEEPALIVE emscripten_bind_Pairing_aggregate_6__P1_P2(blst::Pairing* self, const blst::P1_Affine* pk, const blst::P2_Affine* sig, const blst::byte* msg, long msg_len, const blst::byte* aug, long aug_len) {
  return self->aggregate(pk, sig, msg, msg_len, aug, aug_len);
}

long EMSCRIPTEN_KEEPALIVE emscripten_bind_Pairing_aggregate_6__P2_P1(blst::Pairing* self, const blst::P2_Affine* pk, const blst::P1_Affine* sig, const blst::byte* msg, long msg_len, const blst::byte* aug, long aug_len) {
  return self->aggregate(pk, sig, msg, msg_len, aug, aug_len);
}

long EMSCRIPTEN_KEEPALIVE emscripten_bind_Pairing_mul_n_aggregate_8__P1_P2(blst::Pairing* self, const blst::P1_Affine* pk, const blst::P2_Affine* sig, const blst::byte* scalar, long scalar_len, const blst::byte* msg, long msg_len, const blst::byte* aug, long aug_len) {
  return self->mul_n_aggregate(pk, sig, scalar, scalar_len, msg, msg_len, aug, aug_len);
}

long EMSCRIPTEN_KEEPALIVE emscripten_bind_Pairing_mul_n_aggregate_8__P2_P1(blst::Pairing* self, const blst::P2_Affine* pk, const blst::P1_Affine* sig, const blst::byte* scalar, long scalar_len, const blst::byte* msg, long msg_len, const blst::byte* aug, long aug_len) {
  return self->mul_n_aggregate(pk, sig, scalar, scalar_len, msg, msg_len, aug, aug_len);
}

void EMSCRIPTEN_KEEPALIVE emscripten_bind_Pairing_commit_0(blst::Pairing* self) {
  self->commit();
}

long EMSCRIPTEN_KEEPALIVE emscripten_bind_Pairing_merge_1(blst::Pairing* self, const blst::Pairing* ctx) {
  return self->merge(ctx);
}

bool EMSCRIPTEN_KEEPALIVE emscripten_bind_Pairing_finalverify_1(blst::Pairing* self, const blst::PT* sig) {
  return self->finalverify(sig);
}

void EMSCRIPTEN_KEEPALIVE emscripten_bind_Pairing___destroy___0(blst::Pairing* self) {
  delete self;
}

}

blst::P1* EMSCRIPTEN_KEEPALIVE emscripten_bind_G1_0() {
  return new blst::P1(blst::G1());
}

blst::P2* EMSCRIPTEN_KEEPALIVE emscripten_bind_G2_0() {
  return new blst::P2(blst::G2());
}
