import crypto from "crypto";
import { blst, BLST_ERROR } from "./bindings";

const HASH_OR_ENCODE = true;
const DST = "BLS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_POP_";
const RAND_BYTES = 8;

export { BLST_ERROR };
export class ErrorBLST extends Error {
  constructor(blstError: BLST_ERROR) {
    super(BLST_ERROR[blstError]);
  }
}

const SkConstructor = blst.SecretKey;
const PkConstructor = blst.P1;
const SigConstructor = blst.P2;
const PkAffineConstructor = blst.P1_Affine;
const SigAffineConstructor = blst.P2_Affine;
type Sk = InstanceType<typeof SkConstructor>;
type Pk = InstanceType<typeof PkConstructor>;
type Sig = InstanceType<typeof SigConstructor>;
type PkAffine = InstanceType<typeof PkAffineConstructor>;
type SigAffine = InstanceType<typeof SigAffineConstructor>;

export class SecretKey {
  value: Sk;

  constructor(value: Sk) {
    this.value = value;
  }

  /// Deterministically generate a secret key from input key material
  static fromKeygen(ikm: Uint8Array): SecretKey {
    if (ikm.length < 32) {
      throw new ErrorBLST(BLST_ERROR.BLST_BAD_ENCODING);
    }
    const sk = new SkConstructor();
    sk.keygen(ikm);
    return new SecretKey(sk);
  }

  static fromBytes(skBytes: Uint8Array): SecretKey {
    const sk = new SkConstructor();
    sk.from_bendian(skBytes);
    return new SecretKey(sk);
  }

  toAggregatePublicKey(): AggregatePublicKey {
    const pk = new PkConstructor(this.value);
    return new AggregatePublicKey(pk);
  }

  toPublicKey(): PublicKey {
    const pk = new PkConstructor(this.value);
    return new PublicKey(pk.to_affine());
  }

  sign(msg: Uint8Array): Signature {
    const sig = new SigConstructor();
    sig.hash_to(msg, DST).sign_with(this.value);
    return new Signature(sig.to_affine());
  }

  toBytes(): Uint8Array {
    return this.value.to_bendian();
  }
}

export class PublicKey {
  value: PkAffine;
  constructor(value: PkAffine) {
    this.value = value;
  }

  /** Accepts both compressed and serialized */
  static fromBytes(pkBytes: Uint8Array): PublicKey {
    return new PublicKey(new PkAffineConstructor(pkBytes));
  }

  compress(): Uint8Array {
    return this.value.compress();
  }
  serialize(): Uint8Array {
    return this.value.serialize();
  }
  toBytes(): Uint8Array {
    return this.compress();
  }

  keyValidate(): void {
    if (this.value.is_inf()) {
      throw new ErrorBLST(BLST_ERROR.BLST_PK_IS_INFINITY);
    }
    if (!this.value.in_group()) {
      throw new ErrorBLST(BLST_ERROR.BLST_POINT_NOT_IN_GROUP);
    }
  }
}

export class Signature {
  value: SigAffine;
  constructor(value: SigAffine) {
    this.value = value;
  }

  /** Accepts both compressed and serialized */
  static fromBytes(sigBytes: Uint8Array): Signature {
    return new Signature(new SigAffineConstructor(sigBytes));
  }

  compress(): Uint8Array {
    return this.value.compress();
  }
  serialize(): Uint8Array {
    return this.value.serialize();
  }
  toBytes(): Uint8Array {
    return this.compress();
  }
}

export class AggregatePublicKey {
  value: Pk;

  constructor(value: Pk) {
    this.value = value;
  }

  static fromPublicKey(pk: PublicKey): AggregatePublicKey {
    return new AggregatePublicKey(pk.value.to_jacobian());
  }
  static fromPublicKeys(pks: PublicKey[]): AggregatePublicKey {
    return aggregatePubkeys(
      pks.map((pk) => AggregatePublicKey.fromPublicKey(pk))
    );
  }
  static fromPublicKeysBytes(pks: Uint8Array[]): AggregatePublicKey {
    return AggregatePublicKey.fromPublicKeys(pks.map(PublicKey.fromBytes));
  }

  toPublicKey(): PublicKey {
    return new PublicKey(this.value.to_affine());
  }
  addAggregate(aggPk: AggregatePublicKey) {
    this.value.add(aggPk.value);
  }
  addPublicKey(pk: PublicKey) {
    this.value.aggregate(pk.value);
  }
}

export class AggregateSignature {
  value: Sig;

  constructor(value: Sig) {
    this.value = value;
  }

  static fromSignature(sig: Signature): AggregateSignature {
    return new AggregateSignature(sig.value.to_jacobian());
  }
  static fromSignatures(sigs: Signature[]): AggregateSignature {
    return aggregateSignatures(
      sigs.map((sig) => AggregateSignature.fromSignature(sig))
    );
  }
  static fromSignaturesBytes(sigs: Uint8Array[]): AggregateSignature {
    return AggregateSignature.fromSignatures(sigs.map(Signature.fromBytes));
  }

  toSignature(): Signature {
    return new Signature(this.value.to_affine());
  }
  addAggregate(aggSig: AggregateSignature): void {
    this.value.add(aggSig.value);
  }
  addSignature(sig: Signature): void {
    this.value.aggregate(sig.value);
  }
}

export function aggregatePubkeys(
  pks: AggregatePublicKey[]
): AggregatePublicKey {
  if (pks.length === 0) {
    throw new ErrorBLST(BLST_ERROR.EMPTY_AGGREGATE_ARRAY);
  }

  const agg = pks[0].value.dup();
  for (const pk of pks.slice(1)) {
    agg.add(pk.value);
  }

  return new AggregatePublicKey(agg);
}

export function aggregateSignatures(
  sigs: AggregateSignature[]
): AggregateSignature {
  if (sigs.length === 0) {
    throw new ErrorBLST(BLST_ERROR.EMPTY_AGGREGATE_ARRAY);
  }

  const agg = sigs[0].value.dup();
  for (const pk of sigs.slice(1)) {
    agg.add(pk.value);
  }

  return new AggregateSignature(agg);
}

export function verify(
  msg: Uint8Array,
  pk: PublicKey,
  sig: Signature
): boolean {
  return aggregateVerify([msg], [pk], sig);
}

export function fastAggregateVerify(
  msg: Uint8Array,
  pks: AggregatePublicKey[],
  sig: Signature
): boolean {
  const aggPk = aggregatePubkeys(pks);
  const pk = aggPk.toPublicKey();
  return aggregateVerify([msg], [pk], sig);
}

export function aggregateVerify(
  msgs: Uint8Array[],
  pks: PublicKey[],
  sig: Signature
): boolean {
  const n_elems = pks.length;
  if (msgs.length !== n_elems) {
    throw new ErrorBLST(BLST_ERROR.BLST_VERIFY_FAIL);
  }

  const ctx = new blst.Pairing(HASH_OR_ENCODE, DST);
  for (let i = 0; i < n_elems; i++) {
    const result = ctx.aggregate(pks[i].value, sig.value, msgs[i]);
    if (result !== BLST_ERROR.BLST_SUCCESS) {
      throw new ErrorBLST(result);
    }
  }

  ctx.commit();

  // PT constructor calls `blst_aggregated`
  const gtsig = new blst.PT(sig.value);
  return ctx.finalverify(gtsig);
}

// https://ethresear.ch/t/fast-verification-of-multiple-bls-signatures/5407
export function verifyMultipleAggregateSignatures(
  msgs: Uint8Array[],
  pks: PublicKey[],
  sigs: Signature[]
): boolean {
  const n_elems = pks.length;
  if (msgs.length !== n_elems || sigs.length !== n_elems) {
    throw new ErrorBLST(BLST_ERROR.BLST_VERIFY_FAIL);
  }

  const ctx = new blst.Pairing(HASH_OR_ENCODE, DST);
  for (let i = 0; i < n_elems; i++) {
    const rand = crypto.randomBytes(RAND_BYTES);
    const result = ctx.mul_n_aggregate(
      pks[i].value,
      sigs[i].value,
      rand,
      msgs[i]
    );
    if (result !== BLST_ERROR.BLST_SUCCESS) {
      throw new ErrorBLST(result);
    }
  }

  ctx.commit();
  return ctx.finalverify();
}
