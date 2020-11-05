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
    super(String(blstError));
  }
}

const PkConstructor = blst.P1;
const SigConstructor = blst.P2;
const PkAffineConstructor = blst.P1_Affine;
const SigAffineConstructor = blst.P2_Affine;
type Pk = InstanceType<typeof PkConstructor>;
type Sig = InstanceType<typeof SigConstructor>;
type PkAffine = InstanceType<typeof PkAffineConstructor>;
type SigAffine = InstanceType<typeof SigAffineConstructor>;

export class SecretKey {
  value: Blst.SecretKey;

  constructor(value: Blst.SecretKey) {
    this.value = value;
  }

  /// Deterministically generate a secret key from key material
  static fromKeygen(ikm: u8, key_info: string): SecretKey {
    if (ikm.length < 32) {
      throw new ErrorBLST(BLST_ERROR.BLST_BAD_ENCODING);
    }
    const sk = new blst.SecretKey();
    sk.keygen(ikm, key_info);
    return new SecretKey(sk);
  }

  static fromSerialized(sk_in: u8): SecretKey {
    const sk = new blst.SecretKey();
    sk.from_bendian(sk_in);
    return new SecretKey(sk);
  }

  static fromBytes(sk_in: u8): SecretKey {
    return SecretKey.fromSerialized(sk_in);
  }

  toPublicKey(): PublicKey {
    const pk = new PkConstructor(this.value);
    return new PublicKey(pk.to_affine());
  }

  sign(msg: u8, dst: std__string, aug?: u8): Signature {
    const sig = new SigConstructor();
    sig.hash_to(msg, dst, aug).sign_with(this.value);
    return new Signature(sig.to_affine());
  }

  serialize(): u8_32 {
    return this.value.to_bendian();
  }

  toBytes(): u8_32 {
    return this.serialize();
  }
}

export class PublicKey {
  value: PkAffine;

  constructor(value: PkAffine) {
    this.value = value;
  }

  // Accepts both compressed and serialized
  static fromBytes(pk_in: u8): PublicKey {
    return new PublicKey(new PkAffineConstructor(pk_in));
  }

  static fromAggregate(aggPk: AggregatePublicKey): PublicKey {
    return new PublicKey(aggPk.value.to_affine());
  }

  keyValidate(): void {
    if (!this.value.in_group()) {
      throw new ErrorBLST(BLST_ERROR.BLST_POINT_NOT_IN_GROUP);
    }
  }

  compress(): u8 {
    return this.value.compress();
  }

  serialize(): u8 {
    return this.value.serialize();
  }

  toBytes(): u8 {
    return this.compress();
  }
}

export class AggregatePublicKey {
  value: Pk;

  constructor(value: Pk) {
    this.value = value;
  }

  static fromPublicKey(pk: PublicKey): AggregatePublicKey {
    const aggPk = pk.value.to_jacobian();
    return new AggregatePublicKey(aggPk);
  }

  static fromPublicKeys(pks: PublicKey[]): AggregatePublicKey {
    const aggPk = AggregatePublicKey.fromPublicKey(pks[0]);
    for (const pk of pks.slice(1)) {
      aggPk.value.aggregate(pk.value);
    }
    return aggPk;
  }

  static fromPublicKeysSerialized(pks: u8[]): AggregatePublicKey {
    return AggregatePublicKey.fromPublicKeys(
      pks.map((pk) => PublicKey.fromBytes(pk))
    );
  }

  toPublicKey(): PublicKey {
    const pk = this.value.to_affine();
    return new PublicKey(pk);
  }

  addAggregate(aggPk: AggregatePublicKey) {
    this.value.add(aggPk.value);
  }

  addPublicKey(pk: PublicKey) {
    this.value.aggregate(pk.value);
  }
}

export class Signature {
  value: SigAffine;

  constructor(value: SigAffine) {
    this.value = value;
  }

  // Accepts both compressed and serialized
  static fromBytes(sig_in: u8): Signature {
    return new Signature(new SigAffineConstructor(sig_in));
  }

  static fromAggregate(aggSig: AggregateSignature): Signature {
    return new Signature(aggSig.value.to_affine());
  }

  verify(msg: u8, dst: std__string, pk: PublicKey): BLST_ERROR {
    return this.aggregateVerify([msg], dst, [pk]);
  }

  aggregateVerify(msgs: u8[], dst: std__string, pks: PublicKey[]): BLST_ERROR {
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

  fastAggregateVerify(msg: u8, dst: std__string, pks: PublicKey[]): BLST_ERROR {
    const aggPk = AggregatePublicKey.fromPublicKeys(pks);
    const pk = aggPk.toPublicKey();
    return this.aggregateVerify([msg], dst, [pk]);
  }

  fastAggregateVerifyPreAggregated(
    msg: u8,
    dst: std__string,
    pk: PublicKey
  ): BLST_ERROR {
    return this.aggregateVerify([msg], dst, [pk]);
  }

  // https://ethresear.ch/t/fast-verification-of-multiple-bls-signatures/5407
  verifyMultipleAggregateSignatures(
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

  compress(): u8 {
    return this.value.compress();
  }

  serialize(): u8 {
    return this.value.serialize();
  }

  toBytes(): u8 {
    return this.compress();
  }
}

export class AggregateSignature {
  value: Sig;

  constructor(value: Sig) {
    this.value = value;
  }

  static fromSignature(sig: Signature): AggregateSignature {
    return new AggregateSignature(new SigConstructor(sig.value));
  }

  static fromSignatures(sigs: Signature[]): AggregateSignature {
    const aggSig = AggregateSignature.fromSignature(sigs[0]);
    for (const sig of sigs.slice(1)) {
      aggSig.value.aggregate(sig.value);
    }
    return aggSig;
  }

  static fromSignaturesSerialized(sigs: u8[]): AggregateSignature {
    return AggregateSignature.fromSignatures(
      sigs.map((pk) => Signature.fromBytes(pk))
    );
  }

  addAggregate(aggSig: AggregateSignature): void {
    this.value.add(aggSig.value);
  }

  addSignature(sig: Signature): void {
    this.value.aggregate(sig.value);
  }
}
