import { blst, std__string } from "./index";
import * as Blst from "./index";

type u8 = Uint8Array;
type u8_32 = Uint8Array;

// Unknown stuff
type usize = number;

// MACRO            min_pk   min_sig
// $pk_comp_size	  48	     96
// $pk_ser_size	    96	     192
// $sig_comp_size	  96	     48
// $sig_ser_size	  192	     96

const pk_comp_size = 48;
const pk_ser_size = 96;
const sig_comp_size = 96;
const sig_ser_size = 192;
const hash_or_encode = true;

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

export class SecretKey {
  value: Blst.SecretKey;

  constructor(value: Blst.SecretKey) {
    this.value = value;
  }

  /// Deterministically generate a secret key from key material
  static key_gen(ikm: u8, key_info: string): SecretKey {
    if (ikm.length < 32) {
      throw new ErrorBLST(BLST_ERROR.BLST_BAD_ENCODING);
    }
    const sk = new blst.SecretKey();
    sk.keygen(ikm, key_info);
    return new SecretKey(sk);
  }

  sk_to_pk(): PublicKey {
    const p1 = new blst.P1(this.value);
    return new PublicKey(p1.to_affine());
  }

  sign(msg: u8, dst: std__string, aug: u8): Signature {
    const sig = new blst.P2();
    sig.hash_to(msg, dst, aug).sign_with(this.value);
    return new Signature(sig.to_affine());
  }

  static serialize(sk: SecretKey): u8_32 {
    return sk.value.to_bendian();
  }

  static deserialize(sk_in: u8): SecretKey {
    const sk = new blst.SecretKey();
    sk.from_bendian(sk_in);
    return new SecretKey(sk);
  }

  to_bytes(): u8_32 {
    return SecretKey.serialize(this);
  }

  from_bytes(sk_in: u8): SecretKey {
    return SecretKey.deserialize(sk_in);
  }
}

export class PublicKey {
  value: Blst.P1_Affine;

  constructor(value: Blst.P1_Affine) {
    this.value = value;
  }

  static key_validate(key: u8): PublicKey {
    const pk_aff = new blst.P1_Affine(key);
    if (!pk_aff.in_group()) {
      throw new ErrorBLST(BLST_ERROR.BLST_POINT_NOT_IN_GROUP);
    }
    return new PublicKey(pk_aff);
  }

  from_aggregate(agg_pk: AggregatePublicKey): PublicKey {
    const pk_aff = agg_pk.value.to_affine();
    return new PublicKey(pk_aff);
  }

  // Serdes

  compress(): u8 {
    return this.value.compress();
  }

  serialize(): u8 {
    return this.value.serialize();
  }

  static uncompress(pk_comp: u8): PublicKey {
    if (pk_comp.length == pk_comp_size) {
      const pk_aff = new blst.P1_Affine(pk_comp);
      return new PublicKey(pk_aff);
    } else {
      throw new ErrorBLST(BLST_ERROR.BLST_BAD_ENCODING);
    }
  }

  static deserialize(pk_in: u8): PublicKey {
    if (
      (pk_in.length == pk_ser_size && (pk_in[0] & 0x80) == 0) ||
      (pk_in.length == pk_comp_size && (pk_in[0] & 0x80) != 0)
    ) {
      const pk_aff = new blst.P1_Affine(pk_in);
      return new PublicKey(pk_aff);
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
  value: Blst.P1;

  constructor(value: Blst.P1) {
    this.value = value;
  }

  static from_public_key(pk: PublicKey): AggregatePublicKey {
    const agg_pk = pk.value.to_jacobian();
    return new AggregatePublicKey(agg_pk);
  }

  to_public_key(): PublicKey {
    const pk = this.value.to_affine();
    return new PublicKey(pk);
  }

  static aggregate(pks: PublicKey[]): AggregatePublicKey {
    const agg_pk = AggregatePublicKey.from_public_key(pks[0]);
    for (const s of pks.slice(1)) {
      agg_pk.value.aggregate(s.value);
    }
    return agg_pk;
  }

  static aggregate_serialized(pks: u8[]): AggregatePublicKey {
    return AggregatePublicKey.aggregate(
      pks.map((pk) => PublicKey.from_bytes(pk))
    );
  }

  add_aggregate(agg_pk: AggregatePublicKey) {
    this.value.add(agg_pk.value);
  }

  add_public_key(pk: PublicKey) {
    this.value.aggregate(pk.value);
  }
}

export class Signature {
  value: Blst.P2_Affine;

  constructor(value: Blst.P2_Affine) {
    this.value = value;
  }

  verify(msg: u8, dst: std__string, aug: u8, pk: PublicKey): BLST_ERROR {
    const aug_msg = concatU8(aug, msg);
    return this.aggregate_verify([aug_msg], dst, [pk]);
  }

  aggregate_verify(msgs: u8[], dst: std__string, pks: PublicKey[]): BLST_ERROR {
    const n_elems = pks.length;
    if (msgs.length !== n_elems) {
      throw new ErrorBLST(BLST_ERROR.BLST_VERIFY_FAIL);
    }

    const ctx = new blst.Pairing(hash_or_encode, dst);
    for (let i = 0; i < n_elems; i++) {
      const result = ctx.aggregate(pks[i].value, this.value, msgs[i]);
      if (result !== BLST_ERROR.BLST_SUCCESS) {
        throw new ErrorBLST(result);
      }
    }
    ctx.commit();

    // PT constructor calls `blst_aggregated`
    const gtsig = new blst.PT(this.value);
    if (ctx.finalverify(gtsig)) {
      return BLST_ERROR.BLST_SUCCESS;
    } else {
      return BLST_ERROR.BLST_VERIFY_FAIL;
    }
  }

  fast_aggregate_verify(
    msg: u8,
    dst: std__string,
    pks: PublicKey[]
  ): BLST_ERROR {
    const agg_pk = AggregatePublicKey.aggregate(pks);
    const pk = agg_pk.to_public_key();
    return this.aggregate_verify([msg], dst, [pk]);
  }

  fast_aggregate_verify_pre_aggregated(
    msg: u8,
    dst: std__string,
    pk: PublicKey
  ): BLST_ERROR {
    return this.aggregate_verify([msg], dst, [pk]);
  }

  // https://ethresear.ch/t/fast-verification-of-multiple-bls-signatures/5407
  verify_multiple_aggregate_signatures(
    msgs: u8[],
    dst: std__string,
    pks: PublicKey[],
    sigs: Signature[],
    rands: u8[],
    rand_bits: usize
  ): BLST_ERROR {
    const n_elems = pks.length;
    if (
      msgs.length !== n_elems ||
      sigs.length !== n_elems ||
      rands.length !== n_elems
    ) {
      throw new ErrorBLST(BLST_ERROR.BLST_VERIFY_FAIL);
    }

    const ctx = new blst.Pairing(hash_or_encode, dst);
    for (let i = 0; i < n_elems; i++) {
      const result = ctx.mul_n_aggregate(
        pks[i].value,
        sigs[i].value,
        rands[i],
        rand_bits,
        msgs[i]
      );
      if (result !== BLST_ERROR.BLST_SUCCESS) {
        throw new ErrorBLST(result);
      }
    }

    ctx.commit();

    if (ctx.finalverify()) {
      return BLST_ERROR.BLST_SUCCESS;
    } else {
      return BLST_ERROR.BLST_VERIFY_FAIL;
    }
  }

  static from_aggregate(agg_sig: AggregateSignature): Signature {
    const sig_aff = agg_sig.value.to_affine();
    return new Signature(sig_aff);
  }

  compress(): u8 {
    const sig = this.value.to_jacobian();
    return sig.compress();
  }

  serialize(): u8 {
    const sig = this.value.to_jacobian();
    return sig.serialize();
  }

  static uncompress(sig_comp: u8): Signature {
    if (sig_comp.length == sig_comp_size) {
      const sig_aff = new blst.P2_Affine(sig_comp);
      return new Signature(sig_aff);
    } else {
      throw new ErrorBLST(BLST_ERROR.BLST_BAD_ENCODING);
    }
  }

  static deserialize(sig_in: u8): Signature {
    if (
      (sig_in.length == sig_ser_size && (sig_in[0] & 0x80) == 0) ||
      (sig_in.length == sig_comp_size && (sig_in[0] & 0x80) != 0)
    ) {
      const sig = new blst.P2_Affine(sig_in);
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
  value: Blst.P2;

  constructor(value: Blst.P2) {
    this.value = value;
  }

  static from_signature(sig: Signature): AggregateSignature {
    const p2 = new blst.P2(sig.value);
    return new AggregateSignature(p2);
  }

  static aggregate(sigs: Signature[]): AggregateSignature {
    const agg_sig = AggregateSignature.from_signature(sigs[0]);
    for (const s of sigs.slice(1)) {
      agg_sig.value.aggregate(s.value);
    }
    return agg_sig;
  }

  static aggregate_serialized(sigs: u8[]): AggregateSignature {
    return AggregateSignature.aggregate(
      sigs.map((pk) => Signature.from_bytes(pk))
    );
  }

  add_aggregate(agg_sig: AggregateSignature): void {
    // blst_p2_add_or_double(P2)
    this.value.add(agg_sig.value);
  }

  add_signature(sig: Signature): void {
    this.value.aggregate(sig.value);
  }
}
