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

export type BlstBuffer = Uint8Array;
export type PublicKeyArg = BlstBuffer | PublicKey;
export type SignatureArg = BlstBuffer | Signature;
export interface SignatureSet {
  msg: BlstBuffer;
  publicKey: PublicKeyArg;
  signature: SignatureArg;
}
export interface Serializable {
  serialize(): Uint8Array;
}

/**
 * Critical constants for BLST public key infrastructure.
 */
export const BLST_CONSTANTS: {
  DST: string;
  SECRET_KEY_LENGTH: number;
  PUBLIC_KEY_LENGTH_UNCOMPRESSED: number;
  PUBLIC_KEY_LENGTH_COMPRESSED: number;
  SIGNATURE_LENGTH_UNCOMPRESSED: number;
  SIGNATURE_LENGTH_COMPRESSED: number;
};

/*
 * Private constructor. Randomly generate ikm when new'ing a key if no
 * ikm is provided.
 *
 * Use static methods `SecretKey.deserialize`, `SecretKey.fromKeygen` or
 * `SecretKey.fromKeygenSync` to generate `SecretKey`s from your own material
 * (ie serialized key or ikm). See notes on `SecretKey.fromKeygen` for important
 * security considerations.
 *
 * example:
 * ```typescript
 * const ikm = UintArray8.from(Buffer.from("your very own ikm"));
 * const keyInfo = "Some key info";
 * const key: SecretKey = SecretKey.fromKeygen(ikm, keyInfo);
 *
 * key = SecretKey.fromBytes(key.serialize());
 * ```
 */
export class SecretKey implements Serializable {
  private constructor();
  /**
   * `fromKeygen` takes two parameters. The first parameter is a salt and is
   * required. IKM MUST be at least 32 bytes long, but it MAY be longer. The
   * second parameter, info, is optional and may be used to derive multiple
   * independent keys from the same IKM. By default, info is the empty string.
   */
  static fromKeygen(ikm: BlstBuffer, info?: string): SecretKey;
  /**
   * Convert a serialized secret key into a SecretKey object.
   */
  static deserialize(skBytes: BlstBuffer): SecretKey;
  /**
   * Serialize a secret key into a Buffer.
   */
  serialize(): Buffer;
  toPublicKey(): PublicKey;
  sign(msg: BlstBuffer): Signature;
}

export class PublicKey implements Serializable {
  private constructor();
  static deserialize(skBytes: BlstBuffer, coordType?: CoordType): PublicKey;
  serialize(compress?: boolean): Buffer;
  keyValidate(): void;
}

export class Signature implements Serializable {
  private constructor();
  static deserialize(skBytes: BlstBuffer, coordType?: CoordType): Signature;
  serialize(compress?: boolean): Buffer;
  sigValidate(): void;
}