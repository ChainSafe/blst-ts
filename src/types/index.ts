export interface Blst {
  SecretKey: SecretKeyConstructor;
  P1_Affine: P1_AffineConstructor;
  P2_Affine: P2_AffineConstructor;
  P1: P1Constructor;
  P2: P2Constructor;
  PT: PTConstructor;
  Pairing: PairingConstructor;
}

// SecretKey

export interface SecretKeyConstructor {
  new (): SecretKey;
}

export interface SecretKey {
  // void keygen(const app__string_view IKM, // string_view by value, cool!
  //   const std::string& info = "")
  keygen(bytes: string | Uint8Array): void;
  // from_bendian(const byte in[32])
  from_bendian(bytes: Uint8Array): void;
  // from_lendian(const byte in[32])
  from_lendian(bytes: Uint8Array): void;
  // to_bendian(byte out[32]) const
  to_bendian(): Uint8Array;
  // to_lendian(byte out[32]) const
  to_lendian(): Uint8Array;
}

// Pn_Affine

type Type = "P1" | "P2";

export interface Pn_AffineConstructor<Pn, Pn_Affine> {
  // P1_Affine()
  new (): Pn_Affine;
  // Pn_Affine(const byte *in)
  new (bytes: Uint8Array): Pn_Affine;
  // Pn_Affine(const P1 &jacobian);
  new (p1: Pn): Pn_Affine;
}

const p1: P1_Affine = {};
const p2: P2_Affine = {};

p1.core_verify(p2, true, "", "");

export interface Pn_Affine<ThisType extends Type, OtherType extends Type> {
  type: Type;
  // P1 to_jacobian() const;
  to_jacobian(): Pn<ThisType, OtherType>;
  // void serialize(byte out[96]) const
  serialize(): Uint8Array;
  // void compress(byte out[48]) const
  compress(): Uint8Array;
  // bool on_curve() const
  on_curve(): boolean;
  // bool in_group() const
  in_group(): boolean;
  // bool is_inf() const
  is_inf(): boolean;
  // BLST_ERROR core_verify(const P2_Affine& pk, bool hash_or_encode,
  //   const app__string_view msg,
  //   const std::string& DST = "",
  //   const app__string_view aug = None) const;
  core_verify(
    pk: Pn_Affine<OtherType, ThisType>,
    hash_or_encode: boolean,
    msg: Msg,
    DST: DST,
    pk_for_wire?: Uint8Array
  ): BLST_ERROR;
}

// Pn

export interface PnConstructor<Pn, Pn_Affine> {
  new (): Pn;
  // P1(SecretKey &sk)
  new (secretKey: SecretKey): Pn;
  // P1(const byte *in)
  new (bytes: Uint8Array): Pn;
  // P1(const P1_Affine &affine)
  new (pAffine: Pn_Affine): Pn;
}

export interface Pn<ThisType extends Type, OtherType extends Type> {
  type: Type;
  // P1_Affine to_affine() const
  to_affine(): Pn_Affine<ThisType, OtherType>;
  // void serialize(byte out[96]) const
  serialize(): Uint8Array;
  // void compress(byte out[48]) const
  compress(): Uint8Array;
  // bool is_inf() const
  is_inf(): boolean;
  // void aggregate(const P1_Affine &in)
  aggregate(pAffine: Pn_Affine<ThisType, OtherType>): void;
  // P1* sign_with(SecretKey& sk)
  sign_with(sk: SecretKey): this;
  // P1* hash_to(const app__string_view msg, const std::string& DST = "",
  //   const app__string_view aug = None)
  hash_to(msg: Msg, DST: DST, noIdea: any): this;
  // P1* encode_to(const app__string_view msg, const std::string& DST = "",
  //   const app__string_view aug = None)
  encode_to(msg: Msg, DST: DST, noIdea: any): this;
  // P1* cneg(bool flag)
  cneg(flag: boolean): this;
  // P1* add(const P1& a)
  add(Pn: this): this;
  // P1* add(const P1_Affine &a)
  add(Pn: Pn_Affine<ThisType, OtherType>): this;
  // P1* dbl()
  dbl(): this;

  // Static?

  // static P1 add(const P1& a, const P1& b)
  // static P1 add(const P1& a, const P1_Affine& b)
  // static P1 dbl(const P1& a)
  // static const P1& generator()
}

// P1

export type P1Constructor = PnConstructor<P1, P1_Affine>;
export type P1_AffineConstructor = Pn_AffineConstructor<P1, P1_Affine>;
export type P1 = Pn<"P1", "P2">;
export type P1_Affine = Pn_Affine<"P1", "P2">;

// P2

export type P2Constructor = PnConstructor<P2, P2_Affine>;
export type P2_AffineConstructor = Pn_AffineConstructor<P2, P2_Affine>;
export type P2 = Pn<"P2", "P1">;
export type P2_Affine = Pn_Affine<"P2", "P1">;

// PT

export interface PTConstructor {
  // PT(const P1_Affine &p)
  new (p1Affine: P1_Affine): PT;
  // PT(const P2_Affine &p)
  new (p2Affine: P2_Affine): PT;
}

export interface PT {}

// Pairing

export interface PairingConstructor {
  // Pairing(bool hash_or_encode, const app__string_view DST)
  new (hash_or_encode: boolean, DST: DST): Pairing;
}

export interface Pairing {
  // BLST_ERROR aggregate(const P1_Affine* pk, const P2_Affine* sig,
  //   const app__string_view msg,
  //   const app__string_view aug = None)
  aggregate(
    pk: P1_Affine,
    sig: P2_Affine,
    msg: Msg,
    pk_for_wire?: Uint8Array
  ): BLST_ERROR;
  // BLST_ERROR aggregate(const P2_Affine* pk, const P1_Affine* sig,
  //   const app__string_view msg,
  //   const app__string_view aug = None)
  aggregate(
    pk: P2_Affine,
    sig: P1_Affine,
    msg: Msg,
    pk_for_wire?: Uint8Array
  ): BLST_ERROR;
  // BLST_ERROR mul_n_aggregate(const P1_Affine* pk, const P2_Affine* sig,
  //   const byte* scalar, size_t nbits,
  //   const app__string_view msg,
  //   const app__string_view aug = None)
  mul_n_aggregate(
    pk: P1_Affine,
    sig: P2_Affine,
    scalar: Uint8Array,
    nbits: number,
    msg: Msg,
    pk_for_wire?: Uint8Array
  ): BLST_ERROR;
  // BLST_ERROR mul_n_aggregate(const P2_Affine* pk, const P1_Affine* sig,
  //   const byte* scalar, size_t nbits,
  //   const app__string_view msg,
  //   const app__string_view aug = None)
  mul_n_aggregate(
    pk: P2_Affine,
    sig: P1_Affine,
    scalar: Uint8Array,
    nbits: number,
    msg: Msg,
    pk_for_wire?: Uint8Array
  ): BLST_ERROR;
  // void commit()
  commit(): void;
  // BLST_ERROR merge(const Pairing* ctx)
  merge(ctx: Pairing): BLST_ERROR;
  // bool finalverify(const PT* sig = nullptr) const
  finalverify(sig?: PT): boolean;
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
}

export type Msg = string | Uint8Array;

export type DST = string;
