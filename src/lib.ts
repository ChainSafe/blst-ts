import { blst, BLST_ERROR } from "./index";

const HASH_OR_ENCODE = true;
const DST = "BLS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_POP_";
const RAND_BITS = 64;

class ErrorBLST extends Error {
  constructor(blstError: BLST_ERROR) {
    super(String(blstError));
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

  /// Deterministically generate a secret key from key material
  static fromKeygen(ikm: Uint8Array, keyInfo?: string): SecretKey {
    if (ikm.length < 32) {
      throw new ErrorBLST(BLST_ERROR.BLST_BAD_ENCODING);
    }
    const sk = new SkConstructor();
    sk.keygen(ikm, keyInfo);
    return new SecretKey(sk);
  }

  static fromSerialized(skBytes: Uint8Array): SecretKey {
    const sk = new SkConstructor();
    sk.from_bendian(skBytes);
    return new SecretKey(sk);
  }

  static fromBytes(skBytes: Uint8Array): SecretKey {
    return SecretKey.fromSerialized(skBytes);
  }

  toPublicKey(): PublicKey {
    const pk = new PkConstructor(this.value);
    return new PublicKey(pk.to_affine());
  }

  sign(msg: Uint8Array, dst: string, aug?: Uint8Array): Signature {
    const sig = new SigConstructor();
    sig.hash_to(msg, dst, aug).sign_with(this.value);
    return new Signature(sig.to_affine());
  }

  serialize(): Uint8Array {
    return this.value.to_bendian();
  }

  toBytes(): Uint8Array {
    return this.serialize();
  }
}

export class PublicKey {
  value: PkAffine;

  constructor(value: PkAffine) {
    this.value = value;
  }

  // Accepts both compressed and serialized
  static fromBytes(pkBytes: Uint8Array): PublicKey {
    return new PublicKey(new PkAffineConstructor(pkBytes));
  }

  static fromAggregate(aggPk: AggregatePublicKey): PublicKey {
    return new PublicKey(aggPk.value.to_affine());
  }

  keyValidate(): void {
    if (!this.value.in_group()) {
      throw new ErrorBLST(BLST_ERROR.BLST_POINT_NOT_IN_GROUP);
    }
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

  static fromPublicKeysBytes(pks: Uint8Array[]): AggregatePublicKey {
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
  static fromBytes(sigBytes: Uint8Array): Signature {
    return new Signature(new SigAffineConstructor(sigBytes));
  }

  static fromAggregate(aggSig: AggregateSignature): Signature {
    return new Signature(aggSig.value.to_affine());
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

  static fromSignaturesBytes(sigs: Uint8Array[]): AggregateSignature {
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

export function verify(
  msg: Uint8Array,
  pk: PublicKey,
  sig: Signature
): BLST_ERROR {
  return aggregateVerify([msg], [pk], sig);
}

export function aggregateVerify(
  msgs: Uint8Array[],
  pks: PublicKey[],
  sig: Signature
): BLST_ERROR {
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
  if (ctx.finalverify(gtsig)) {
    return BLST_ERROR.BLST_SUCCESS;
  } else {
    return BLST_ERROR.BLST_VERIFY_FAIL;
  }
}

export function fastAggregateVerify(
  msg: Uint8Array,
  pks: PublicKey[],
  sig: Signature
): BLST_ERROR {
  const aggPk = AggregatePublicKey.fromPublicKeys(pks);
  const pk = aggPk.toPublicKey();
  return aggregateVerify([msg], [pk], sig);
}

export function fastAggregateVerifyPreAggregated(
  msg: Uint8Array,
  pk: PublicKey,
  sig: Signature
): BLST_ERROR {
  return aggregateVerify([msg], [pk], sig);
}

// https://ethresear.ch/t/fast-verification-of-multiple-bls-signatures/5407
export function verifyMultipleAggregateSignatures(
  msgs: Uint8Array[],
  pks: PublicKey[],
  sigs: Signature[],
  rands: Uint8Array[]
): BLST_ERROR {
  const n_elems = pks.length;
  if (
    msgs.length !== n_elems ||
    sigs.length !== n_elems ||
    rands.length !== n_elems
  ) {
    throw new ErrorBLST(BLST_ERROR.BLST_VERIFY_FAIL);
  }

  const ctx = new blst.Pairing(HASH_OR_ENCODE, DST);
  for (let i = 0; i < n_elems; i++) {
    const result = ctx.mul_n_aggregate(
      pks[i].value,
      sigs[i].value,
      rands[i],
      RAND_BITS,
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
