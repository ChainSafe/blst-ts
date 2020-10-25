type u8 = Uint8Array;
type u8_32 = Uint8Array;
type u64 = Uint8Array;

// Unknown stuff
type blst_scalar = any;
type pk_aff = any;
type pk = any;
type sig_aff = any;
type usize = any;
const BLST: any = {};
const MACRO: any = {};

const pk_comp_size = 0;
const pk_ser_size = 0;

enum BLST_ERROR {
  BLST_SUCCESS = 0,
  BLST_BAD_ENCODING,
  BLST_POINT_NOT_ON_CURVE,
  BLST_POINT_NOT_IN_GROUP,
  BLST_AGGR_TYPE_MISMATCH,
  BLST_VERIFY_FAIL,
  BLST_PK_IS_INFINITY,
}

class ErrorBLST extends Error {
  constructor(blstError: BLST_ERROR) {
    super(String(BLST_ERROR));
  }
}

function concatU8(a: Uint8Array, b: Uint8Array): Uint8Array {}

export class Pairing {
  v: u64; // blst_pairing

  constructor(hash_or_encode: boolean, dst: u8) {
    this.v = Vec_u64();
    blst_pairing_init(this.v, hash_or_encode, dst);
  }

  init(pairing: Pairing, hash_or_encode: boolean, dst: u8[]) {}

  ctx(): blst_pairing {
    return this.v;
  }

  const_ctx(): blst_pairing {
    return this.v;
  }

  aggregate(pk: dynAny, sig: dynAny, msg: u8, aug: u8): BLST_ERROR {
    if (pk.isP1) {
      return blst_pairing_aggregate_pk_in_g1(this.ctx(), pk, sig, msg, aug);
    } else if (pk.isP2) {
      return blst_pairing_aggregate_pk_in_g2(this.ctx(), pk, sig, msg, aug);
    } else {
      throw Error("whaaaa?");
    }
  }

  mul_n_aggregate(
    pk: dynAny,
    sig: dynAny,
    scalar: u8,
    nbits: usize,
    msg: u8,
    aug: u8
  ): BLST_ERROR {
    if (pk.isP1) {
      return blst_pairing_mul_n_aggregate_pk_in_g1(
        this.ctx(),
        pk,
        sig,
        scalar,
        nbits,
        msg,
        aug
      );
    } else if (pk.isP2) {
      return blst_pairing_mul_n_aggregate_pk_in_g2(
        this.ctx(),
        pk,
        sig,
        scalar,
        nbits,
        msg,
        aug
      );
    } else {
      throw Error("whaaaa?");
    }
  }

  aggregated(gtsig: blst_fp12, sig: dynAny) {
    if (sig.isP1) {
      blst_aggregated_in_g1(gtsig, sig);
    } else if (sig.isP2) {
      blst_aggregated_in_g2(gtsig, sig);
    } else {
      throw Error("whaaaa?");
    }
  }

  commit() {
    blst_pairing_commit(this.ctx());
  }

  merge(ctx1: Pairing) {
    blst_pairing_merge(this.ctx(), ctx1.const_ctx());
  }

  finalverify(gtsig: blst_fp12): boolean {
    return blst_pairing_finalverify(this.const_ctx(), gtsig);
  }
}

export class SecretKey {
  value: blst_scalar;

  constructor(value: blst_scalar) {
    this.value = value;
  }

  /// Deterministically generate a secret key from key material
  static key_gen(ikm: u8, key_info: u8): SecretKey {
    if (ikm.length < 32) throw new ErrorBLST(BLST_ERROR.BLST_BAD_ENCODING);
    const sk = BLST.SecretKey.default();
    MACRO.blst_keygen(sk.value, ikm, key_info);
    return new SecretKey(sk.value);
  }

  sk_to_pk(): PublicKey {
    const pk_aff = BLST.PublicKey.default();
    MACRO.sk_to_pk(pk_aff.point, this.value);
    return pk_aff;
  }

  sign(msg: u8, dst: u8, aug: u8): Signature {
    const q = new MACRO.Sig.default();
    const sig_aff = new MACRO.Sig_Aff.default();
    MACRO.hash_or_encode_to(q, msg, dst, aug);
    MACRO.sign(sig_aff, this.value);
    return new Signature(sig_aff);
  }

  static serialize(sk: SecretKey): u8_32 {
    return BLST.blst_bendian_from_scalar(sk.value);
  }

  static deserialize(sk_in: u8): SecretKey {
    const sk = BLST.blst_scalar_from_bendian(sk_in);
    return new SecretKey({ value: sk });
  }

  to_bytes(): u8_32 {
    return SecretKey.serialize(this);
  }

  from_bytes(sk_in: u8): SecretKey {
    return SecretKey.deserialize(sk_in);
  }
}

export class PublicKey {
  point: pk_aff;

  constructor(point: pk_aff) {
    this.point = point;
  }

  key_validate(key: u8): PublicKey {
    const pk = BLST.PublicKey.from_bytes(key);
    if (!MACRO.pk_in_group(key)) {
      throw new ErrorBLST(BLST_ERROR.BLST_POINT_NOT_IN_GROUP);
    }
    return pk;
  }

  from_aggregate(agg_pk: AggregatePublicKey): PublicKey {
    const pk_aff = MACRO.pk_to_aff(agg_pk);
    return new PublicKey(pk_aff);
  }

  // Serdes

  compress(): u8 {
    const pk = MACRO.pk_from_aff(this.point);
    return MACRO.pk_comp(pk);
  }

  serialize(): u8 {
    const pk = MACRO.pk_from_aff(this.point);
    return MACRO.pk_ser(pk);
  }

  static uncompress(pk_comp: u8): PublicKey {
    if (pk_comp.length == pk_comp_size) {
      const pk = MACRO.pk_uncomp(pk_comp);
      return new PublicKey({ point: pk });
    } else {
      throw new ErrorBLST(BLST_ERROR.BLST_BAD_ENCODING);
    }
  }

  static deserialize(pk_in: u8): PublicKey {
    if (
      (pk_in.length == pk_ser_size && (pk_in[0] & 0x80) == 0) ||
      (pk_in.length == pk_comp_size && (pk_in[0] & 0x80) != 0)
    ) {
      const pk = MACRO.pk_deser(pk_in);
      return new PublicKey({ point: pk });
    } else {
      throw new ErrorBLST(BLST_ERROR.BLST_BAD_ENCODING);
    }
  }

  static from_bytes(pk_in: u8): PublicKey {
    if ((pk_in[0] & 0x80) == 0) {
      // Not compressed
      return PublicKey.deserialize(pk_in);
    } else {
      // compressed
      return PublicKey.uncompress(pk_in);
    }
  }

  to_bytes(): u8 {
    return this.compress();
  }
}

export class AggregatePublicKey {
  point: pk;

  constructor(point: pk) {
    this.point = point;
  }

  static from_public_key(pk: PublicKey): AggregatePublicKey {
    const agg_pk = MACRO.pk_from_aff(pk.point);
    return new AggregatePublicKey(agg_pk);
  }

  to_public_key(): PublicKey {
    const pk = MACRO.pk_to_aff(this.point);
    return new PublicKey(pk);
  }

  static aggregate(pks: PublicKey[]): AggregatePublicKey {
    const agg_pk = AggregatePublicKey.from_public_key(pks[0]);
    for (const s of pks.slice(1)) {
      MACRO.pk_add_or_dbl_aff(agg_pk.point, s.point);
    }
    return agg_pk;
  }

  static aggregate_serialized(pks: u8[]): AggregatePublicKey {
    return AggregatePublicKey.aggregate(
      pks.map((pk) => PublicKey.from_bytes(pk))
    );
  }

  add_aggregate(agg_pk: AggregatePublicKey) {
    MACRO.pk_add_or_dbl(this.point, agg_pk.point);
  }

  add_public_key(pk: PublicKey) {
    MACRO.pk_add_or_dbl_aff(this.point, pk.point);
  }
}

export class Signature {
  point: sig_aff;

  constructor(point: sig_aff) {
    this.point = point;
  }

  verify(msg: u8, dst: u8, aug: u8, pk: PublicKey): BLST_ERROR {
    const aug_msg = concatU8(aug, msg);
    return this.aggregate_verify([aug_msg], dst, [pk]);
  }

  aggregate_verify(msgs: u8[], dst: u8, pks: PublicKey[]): BLST_ERROR {
    const n_elems = pks.length;
    if (msgs.length !== n_elems) {
      throw new ErrorBLST(BLST_ERROR.BLST_VERIFY_FAIL);
    }

    const pairing = new Pairing(MACRO.hash_or_encode, dst);
    for (let i = 0; i < n_elems; i++) {
      const result = pairing.aggregate(
        pks[i].point,
        new MACRO.sig_aff(),
        msgs[i],
        []
      );
      if (result !== BLST_ERROR.BLST_SUCCESS) {
        throw new ErrorBLST(result);
      }
    }
    pairing.commit();

    const gtsig = blst_fp12.default();
    Pairing.aggregated(gtsig, this.point);
    if (acc.finalverify(gtsig)) {
      return BLST_ERROR.BLST_SUCCESS;
    } else {
      return BLST_ERROR.BLST_VERIFY_FAIL;
    }
  }

  fast_aggregate_verify(msg: u8, dst: u8, pks: PublicKey[]): BLST_ERROR {
    const agg_pk = AggregatePublicKey.aggregate(pks);
    const pk = agg_pk.to_public_key();
    return this.aggregate_verify([msg], dst, [pk]);
  }

  fast_aggregate_verify_pre_aggregated(
    msg: u8,
    dst: u8,
    pk: PublicKey
  ): BLST_ERROR {
    return this.aggregate_verify([msg], dst, [pk]);
  }

  // https://ethresear.ch/t/fast-verification-of-multiple-bls-signatures/5407
  verify_multiple_aggregate_signatures(
    msgs: u8[],
    dst: u8,
    pks: PublicKey[],
    sigs: Signature[],
    rands: blst_scalar[],
    rand_bits: usize
  ): BLST_ERROR {
    const n_elems = pks.length;
    if (
      msgs.length !== n_elems ||
      sigs.length !== n_elems ||
      rands.length !== n_elems
    ) {
      throw new ErrorBLST("BLST_ERROR_BLST_VERIFY_FAIL");
    }

    const pairing = new Pairing(MACRO.hash_or_encode, dst);
    for (let i = 0; i < n_elems; i++) {
      const result = pairing.mul_n_aggregate(
        pks[i].point,
        sigs[i].point,
        rands[i].b,
        rand_bits,
        msgs[i],
        []
      );
      if (result !== BLST_ERROR.BLST_SUCCESS) {
        throw new ErrorBLST(result);
      }
    }

    pairing.commit();

    if (acc.finalverify(None)) {
      return BLST_ERROR.BLST_SUCCESS;
    } else {
      return BLST_ERROR.BLST_VERIFY_FAIL;
    }
  }

  static from_aggregate(agg_sig: AggregateSignature): Signature {
    const sig_aff = MACRO.sig_to_aff(agg_sig.point);
    return new Signature(sig_aff);
  }

  compress(): u8 {
    const sig = MACRO.sig_from_aff(this.point);
    const sig_comp = MACRO.sig_comp(sig);
    return sig_comp;
  }

  serialize(): u8 {
    const sig = MACRO.sig_from_aff(this.point);
    const sig_out = MACRO.sig_ser(sig);
    return sig_out;
  }

  static uncompress(sig_comp): Signature {
    if (sig_comp.length == MACRO.sig_comp_size) {
      const sig = MACRO.sig_uncomp(sig_comp);
      return new Signature(sig);
    } else {
      throw new ErrorBLST(BLST_ERROR.BLST_BAD_ENCODING);
    }
  }

  static deserialize(sig_in: u8): Signature {
    if (
      (sig_in.length == MACRO.sig_ser_size && (sig_in[0] & 0x80) == 0) ||
      (sig_in.length == MACRO.sig_comp_size && (sig_in[0] & 0x80) != 0)
    ) {
      const sig = MACRO.sig_deser(sig_in);
      return new Signature(sig);
    } else {
      throw new ErrorBLST(BLST_ERROR.BLST_BAD_ENCODING);
    }
  }

  static from_bytes(sig_in: u8): Signature {
    if ((sig_in[0] & 0x80) == 0) {
      // Not compressed
      return Signature.deserialize(sig_in);
    } else {
      // compressed
      return Signature.uncompress(sig_in);
    }
  }

  to_bytes(): u8 {
    return this.compress();
  }
}

export class AggregateSignature {
  point: sig_aff;

  constructor(point: sig_aff) {
    this.point = point;
  }

  static from_signature(sig: Signature): AggregateSignature {
    const agg_sig = MACRO.sig_from_aff(sig.point);
    return new AggregateSignature(agg_sig);
  }

  static aggregate(sigs: Signature[]): AggregateSignature {
    const agg_sig = AggregateSignature.from_signature(sigs[0]);
    for (const s of sigs.slice(1)) {
      MACRO.sig_add_or_dbl_aff(agg_sig.point, s.point);
    }
    return agg_sig;
  }

  static aggregate_serialized(sigs: u8[]): AggregateSignature {
    return AggregateSignature.aggregate(
      sigs.map((pk) => Signature.from_bytes(pk))
    );
  }

  add_aggregate(agg_sig: AggregateSignature): void {
    MACRO.sig_add_or_dbl(this.point, agg_sig.point);
  }

  add_signature(sig: Signature): void {
    MACRO.sig_add_or_dbl_aff(this.point, sig.point);
  }
}
