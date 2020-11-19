export interface Blst {
  SecretKey: SecretKeyConstructor;
  P1_Affine: P1_AffineConstructor;
  P2_Affine: P2_AffineConstructor;
  P1: P1Constructor;
  P2: P2Constructor;
  PT: PTConstructor;
  Pairing: PairingConstructor;
}

// blst.hpp types

type bool = boolean;
type size_t = number;
type app__string_view = string | Uint8Array;
type std__string = string;
type byte = Uint8Array;

// SecretKey

export interface SecretKeyConstructor {
  new (): SecretKey;
}

export interface SecretKey {
  // void keygen(const app__string_view IKM, // string_view by value, cool!
  //   const std::string& info = "")
  keygen(IKM: app__string_view, info?: std__string): void;
  // from_bendian(const byte in[32])
  from_bendian(bytes: byte): void;
  // from_lendian(const byte in[32])
  from_lendian(bytes: byte): void;
  // to_bendian(byte out[32]) const
  to_bendian(): byte;
  // to_lendian(byte out[32]) const
  to_lendian(): byte;
}

// Pn_Affine

// Typescript will consider P1 = P2 if their interface contents are equal
// The extra type property forces P1 and P2 interfaces to be different
type P1Type = "p1Type";
type P2Type = "p2Type";
type PnType = P1Type | P2Type;

export interface Pn_AffineConstructor<Pn, Pn_Affine> {
  // P1_Affine()
  new (): Pn_Affine;
  // Pn_Affine(const byte *in)
  new (bytes: byte): Pn_Affine;
  // Pn_Affine(const P1 &jacobian);
  new (jacobian: Pn): Pn_Affine;
}

export interface Pn_Affine<
  ThisType extends PnType,
  Other_Pn_Affine extends Pn_Affine<any, any>
> {
  type: ThisType;
  // P1 to_jacobian() const;
  to_jacobian(): Pn<ThisType, this>;
  // void serialize(byte out[96]) const
  serialize(): byte;
  // void compress(byte out[48]) const
  compress(): byte;
  // bool on_curve() const
  on_curve(): bool;
  // bool in_group() const
  in_group(): bool;
  // bool is_inf() const
  is_inf(): bool;
  // BLST_ERROR core_verify(const P2_Affine& pk, bool hash_or_encode,
  //   const app__string_view msg,
  //   const std::string& DST = "",
  //   const app__string_view aug = None) const;
  core_verify(
    pk: Other_Pn_Affine,
    hash_or_encode: bool,
    msg: app__string_view,
    DST?: std__string,
    aug?: app__string_view
  ): BLST_ERROR;
}

// Pn

export interface PnConstructor<Pn, Pn_Affine> {
  // P1()
  new (): Pn;
  // P1(SecretKey& sk)
  new (sk: SecretKey): Pn;
  // P1(const byte *in)
  new (bytes: byte): Pn;
  // P1(const P1_Affine& affine)
  new (affine: Pn_Affine): Pn;

  // static P1 add(const P1& a, const P1& b)
  add(a: Pn, b: Pn): Pn;
  // static P1 add(const P1& a, const P1_Affine& b)
  add(a: Pn, b: Pn_Affine): Pn;
  // static P1 dbl(const P1& a)
  dbl(a: Pn): Pn;
  // static const P1& generator()
  generator(): Pn;
}

export interface Pn<
  ThisType extends PnType,
  This_Pn_Affine extends Pn_Affine<ThisType, any>
> {
  type: ThisType;
  // P1_Affine to_affine() const
  to_affine(): This_Pn_Affine;
  // void serialize(byte out[96]) const
  serialize(): byte;
  // void compress(byte out[48]) const
  compress(): byte;
  // bool is_inf() const
  is_inf(): bool;
  // void aggregate(const P1_Affine &in)
  aggregate(affine: This_Pn_Affine): void;
  // P1* sign_with(SecretKey& sk)
  sign_with(sk: SecretKey): this;
  // P1* hash_to(const app__string_view msg, const std::string& DST = "",
  //   const app__string_view aug = None)
  hash_to(
    msg: app__string_view,
    DST?: std__string,
    aug?: app__string_view
  ): this;
  // P1* encode_to(const app__string_view msg, const std::string& DST = "",
  //   const app__string_view aug = None)
  encode_to(
    msg: app__string_view,
    DST?: std__string,
    aug?: app__string_view
  ): this;
  // P1* cneg(bool flag)
  cneg(flag: bool): this;
  // P1* add(const P1& a)
  add(a: this): this;
  // P1* add(const P1_Affine &a)
  add(a: This_Pn_Affine): this;
  // P1* dbl()
  dbl(): this;
}

// P1

export type P1Constructor = PnConstructor<P1, P1_Affine>;
export type P1_AffineConstructor = Pn_AffineConstructor<P1, P1_Affine>;
export type P1 = Pn<P1Type, P1_Affine>;
export type P1_Affine = Pn_Affine<P1Type, P2_Affine>;

// P2

export type P2Constructor = PnConstructor<P2, P2_Affine>;
export type P2_AffineConstructor = Pn_AffineConstructor<P2, P2_Affine>;
export type P2 = Pn<P2Type, P2_Affine>;
export type P2_Affine = Pn_Affine<P2Type, P1_Affine>;

// PT

export interface PTConstructor {
  // PT(const P1_Affine& p)
  new (p: P1_Affine): PT;
  // PT(const P2_Affine& p)
  new (p: P2_Affine): PT;
}

export interface PT {}

// Pairing

export interface PairingConstructor {
  // Pairing(bool hash_or_encode, const app__string_view DST)
  new (hash_or_encode: bool, DST: std__string): Pairing;
}

export interface Pairing {
  // BLST_ERROR aggregate(const P1_Affine* pk, const P2_Affine* sig,
  //   const app__string_view msg,
  //   const app__string_view aug = None)
  aggregate(
    pk: P1_Affine,
    sig: P2_Affine,
    msg: app__string_view,
    aug?: app__string_view
  ): BLST_ERROR;
  // BLST_ERROR aggregate(const P2_Affine* pk, const P1_Affine* sig,
  //   const app__string_view msg,
  //   const app__string_view aug = None)
  aggregate(
    pk: P2_Affine,
    sig: P1_Affine,
    msg: app__string_view,
    aug?: app__string_view
  ): BLST_ERROR;
  // BLST_ERROR mul_n_aggregate(const P1_Affine* pk, const P2_Affine* sig,
  //   const byte* scalar, size_t nbits,
  //   const app__string_view msg,
  //   const app__string_view aug = None)
  mul_n_aggregate(
    pk: P1_Affine,
    sig: P2_Affine,
    scalar: byte,
    nbits: size_t,
    msg: app__string_view,
    aug?: app__string_view
  ): BLST_ERROR;
  // BLST_ERROR mul_n_aggregate(const P2_Affine* pk, const P1_Affine* sig,
  //   const byte* scalar, size_t nbits,
  //   const app__string_view msg,
  //   const app__string_view aug = None)
  mul_n_aggregate(
    pk: P2_Affine,
    sig: P1_Affine,
    scalar: byte,
    nbits: size_t,
    msg: app__string_view,
    aug?: app__string_view
  ): BLST_ERROR;
  // void commit()
  commit(): void;
  // BLST_ERROR merge(const Pairing* ctx)
  merge(ctx: Pairing): BLST_ERROR;
  // bool finalverify(const PT* sig = nullptr) const
  finalverify(sig?: PT): bool;
}

// Misc

export enum BLST_ERROR {
  BLST_SUCCESS = 0,
  BLST_BAD_ENCODING = 1,
  BLST_POINT_NOT_ON_CURVE = 2,
  BLST_POINT_NOT_IN_GROUP = 3,
  BLST_AGGR_TYPE_MISMATCH = 4,
  BLST_VERIFY_FAIL = 5,
  BLST_PK_IS_INFINITY = 6,

  // Extra errors not in native bindings
  EMPTY_AGGREGATE_ARRAY = "EMPTY_AGGREGATE_ARRAY",
}
