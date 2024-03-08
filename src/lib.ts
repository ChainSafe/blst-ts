import crypto from "crypto";
import {blst, BLST_ERROR} from "./bindings";

const HASH_OR_ENCODE = true;
const DST = "BLS_SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_POP_";
const RAND_BYTES = 8;

const SECRET_KEY_LENGTH = 32;
const PUBLIC_KEY_LENGTH_COMPRESSED = 48;
const PUBLIC_KEY_LENGTH_UNCOMPRESSED = 48 * 2;
const SIGNATURE_LENGTH_COMPRESSED = 96;
const SIGNATURE_LENGTH_UNCOMPRESSED = 96 * 2;

export {BLST_ERROR};
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

/**
 * Points are represented in two ways in BLST:
 * - affine coordinates (x,y)
 * - jacobian coordinates (x,y,z)
 *
 * The jacobian coordinates allow to aggregate points more efficiently,
 * so if P1 points are aggregated often (Eth2.0) you want to keep the point
 * cached in jacobian coordinates.
 */
export enum CoordType {
  affine,
  jacobian,
}

export class SecretKey {
  value: Sk;

  constructor(value: Sk) {
    this.value = value;
  }

  /// Deterministically generate a secret key from input key material
  static fromKeygen(ikm: Uint8Array): SecretKey {
    if (ikm.length < SECRET_KEY_LENGTH) {
      throw new ErrorBLST(BLST_ERROR.BLST_BAD_ENCODING);
    }
    const sk = new SkConstructor();
    sk.keygen(ikm);
    return new SecretKey(sk);
  }

  static fromBytes(skBytes: Uint8Array): SecretKey {
    if (skBytes.length !== SECRET_KEY_LENGTH) {
      throw new ErrorBLST(BLST_ERROR.BLST_INVALID_SIZE);
    }
    if (isZeroBytes(skBytes)) {
      throw new ErrorBLST(BLST_ERROR.ZERO_SECRET_KEY);
    }
    const sk = new SkConstructor();
    sk.from_bendian(skBytes);
    return new SecretKey(sk);
  }

  toPublicKey(): PublicKey {
    const pk = new PkConstructor(this.value);
    return new PublicKey(pk); // Store as jacobian
  }

  sign(msg: Uint8Array): Signature {
    const sig = new SigConstructor();
    sig.hash_to(msg, DST).sign_with(this.value);
    return new Signature(sig); // Store as jacobian
  }

  toBytes(): Uint8Array {
    return this.value.to_bendian();
  }
}

/**
 * Wrapper for P1 points. Internal point may be represented
 * in affine or jacobian coordinates, @see CoordType
 * This approach allows to use this wrapper very flexibly while
 * minimizing the coordinate conversions if used properly.
 *
 * To force a instance of PublicKey to permanently switch its coordType
 * ```ts
 * const pkAsAffine = new PublicKey(pk.affine)
 * ```
 */
export class PublicKey {
  readonly value: PkAffine | Pk;
  constructor(value: PkAffine | Pk) {
    this.value = value;
  }

  /** Accepts both compressed and serialized */
  static fromBytes(pkBytes: Uint8Array, type = CoordType.jacobian): PublicKey {
    if (pkBytes.length !== PUBLIC_KEY_LENGTH_COMPRESSED && pkBytes.length !== PUBLIC_KEY_LENGTH_UNCOMPRESSED) {
      throw new ErrorBLST(BLST_ERROR.BLST_INVALID_SIZE);
    }
    if (type === CoordType.affine) {
      return new PublicKey(new PkAffineConstructor(pkBytes));
    } else {
      return new PublicKey(new PkConstructor(pkBytes));
    }
  }

  get affine(): PkAffine {
    return typeof (this.value as Pk).to_affine === "function"
      ? (this.value as Pk).to_affine()
      : (this.value as PkAffine);
  }

  get jacobian(): Pk {
    return typeof (this.value as PkAffine).to_jacobian === "function"
      ? (this.value as PkAffine).to_jacobian()
      : (this.value as Pk);
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

  /** Validate pubkey is not infinity and is in group */
  keyValidate(): void {
    if (this.value.is_inf()) {
      throw new ErrorBLST(BLST_ERROR.BLST_PK_IS_INFINITY);
    }
    if (!this.value.in_group()) {
      throw new ErrorBLST(BLST_ERROR.BLST_POINT_NOT_IN_GROUP);
    }
  }
}

/**
 * Wrapper for P2 points. @see PublicKey
 */
export class Signature {
  readonly value: SigAffine | Sig;
  constructor(value: SigAffine | Sig) {
    this.value = value;
  }

  /** Accepts both compressed and serialized */
  static fromBytes(sigBytes: Uint8Array, type = CoordType.affine): Signature {
    /** P2 compressed is 96 bytes else 192 bytes */
    if (sigBytes.length !== SIGNATURE_LENGTH_COMPRESSED && sigBytes.length !== SIGNATURE_LENGTH_UNCOMPRESSED) {
      throw new ErrorBLST(BLST_ERROR.BLST_INVALID_SIZE);
    }
    if (type === CoordType.affine) {
      return new Signature(new SigAffineConstructor(sigBytes));
    } else {
      return new Signature(new SigConstructor(sigBytes));
    }
  }

  get affine(): SigAffine {
    return typeof (this.value as Sig).to_affine === "function"
      ? (this.value as Sig).to_affine()
      : (this.value as SigAffine);
  }

  get jacobian(): Sig {
    return typeof (this.value as SigAffine).to_jacobian === "function"
      ? (this.value as SigAffine).to_jacobian()
      : (this.value as Sig);
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

  /** Validate sig is in group */
  sigValidate(): void {
    if (!this.value.in_group()) {
      throw new ErrorBLST(BLST_ERROR.BLST_POINT_NOT_IN_GROUP);
    }
  }
}

/**
 * Aggregates all `pks` and returns a PublicKey containing a jacobian point
 */
export function aggregatePubkeys(pks: PublicKey[]): PublicKey {
  if (pks.length === 0) {
    throw new ErrorBLST(BLST_ERROR.EMPTY_AGGREGATE_ARRAY);
  }

  const agg = new PkConstructor(); // Faster than using .dup()
  for (const pk of pks) agg.add(pk.jacobian);
  return new PublicKey(agg);
}

/**
 * Aggregates all `sigs` and returns a Signature containing a jacobian point
 */
export function aggregateSignatures(sigs: Signature[]): Signature {
  if (sigs.length === 0) {
    throw new ErrorBLST(BLST_ERROR.EMPTY_AGGREGATE_ARRAY);
  }

  const agg = new SigConstructor(); // Faster than using .dup()
  for (const pk of sigs) agg.add(pk.jacobian);
  return new Signature(agg);
}

/**
 * Verify a single message from a single pubkey
 */
export function verify(msg: Uint8Array, pk: PublicKey, sig: Signature): boolean {
  return aggregateVerify([msg], [pk], sig);
}

/**
 * Verify a single message from multiple pubkeys
 */
export function fastAggregateVerify(msg: Uint8Array, pks: PublicKey[], sig: Signature): boolean {
  const aggPk = aggregatePubkeys(pks);
  return aggregateVerify([msg], [aggPk], sig);
}

/**
 * Verify multiple messages from multiple pubkeys
 */
export function aggregateVerify(msgs: Uint8Array[], pks: PublicKey[], sig: Signature): boolean {
  const n_elems = pks.length;
  if (msgs.length !== n_elems) {
    throw new ErrorBLST(BLST_ERROR.BLST_VERIFY_FAIL);
  }

  if (n_elems === 0) {
    throw new ErrorBLST(BLST_ERROR.EMPTY_AGGREGATE_ARRAY);
  }

  const sigAff = sig.affine;
  const ctx = new blst.Pairing(HASH_OR_ENCODE, DST);
  for (let i = 0; i < n_elems; i++) {
    const result = ctx.aggregate(pks[i].affine, sigAff, msgs[i]);
    if (result !== BLST_ERROR.BLST_SUCCESS) {
      throw new ErrorBLST(result);
    }
  }

  ctx.commit();

  // PT constructor calls `blst_aggregated`
  const gtsig = new blst.PT(sigAff);
  return ctx.finalverify(gtsig);
}

export type SignatureSet = {
  msg: Uint8Array;
  pk: PublicKey;
  sig: Signature;
};

/**
 * Batch verify groups of {msg, pk, sig}[]
 * https://ethresear.ch/t/fast-verification-of-multiple-bls-signatures/5407
 */
export function verifyMultipleAggregateSignatures(signatureSets: SignatureSet[]): boolean {
  const ctx = new blst.Pairing(HASH_OR_ENCODE, DST);
  for (const {msg, pk, sig} of signatureSets) {
    const rand = randomBytesNonZero(RAND_BYTES);
    const result = ctx.mul_n_aggregate(pk.affine, sig.affine, rand, msg);
    if (result !== BLST_ERROR.BLST_SUCCESS) {
      throw new ErrorBLST(result);
    }
  }

  ctx.commit();
  return ctx.finalverify();
}

/**
 * `rand` must not be exactly zero. Otherwise it would allow the verification of invalid signatures
 * See https://github.com/ChainSafe/blst-ts/issues/45
 */
export function randomBytesNonZero(BYTES_COUNT: number): Buffer {
  const rand = crypto.randomBytes(BYTES_COUNT);
  for (let i = 0; i < BYTES_COUNT; i++) {
    if (rand[0] !== 0) return rand;
  }
  rand[0] = 1;
  return rand;
}

function isZeroBytes(bytes: Uint8Array): boolean {
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] !== 0) {
      return false;
    }
  }
  return true;
}
