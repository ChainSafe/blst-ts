export type BlstBuffer = Uint8Array;
export type PublicKeyArg = BlstBuffer | PublicKey;
export type SignatureArg = BlstBuffer | Signature;

export interface SignatureSet {
  message: BlstBuffer;
  publicKey: PublicKeyArg;
  signature: SignatureArg;
}

export interface Serializable {
  serialize(): Uint8Array;
}

export enum CoordType {
  affine = 0,
  jacobian = 1,
}

/**
 * Critical constants for BLST public key infrastructure.
 */
export declare const BLST_CONSTANTS_TYPE: {
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
export declare class SecretKey implements Serializable {
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
  toHex(): string;
  toPublicKey(): PublicKey;
  sign(msg: BlstBuffer): Signature;
}

export declare class PublicKey implements Serializable {
  private constructor();
  static deserialize(pkBytes: BlstBuffer, coordType?: CoordType): PublicKey;
  serialize(compress?: boolean): Buffer;
  toHex(compress?: boolean): string;
  keyValidate(): void;
  isInfinity(): boolean;
  multiplyBy(randomBytes: BlstBuffer): PublicKey;
}

export declare class Signature implements Serializable {
  private constructor();
  static deserialize(sigBytes: BlstBuffer, coordType?: CoordType): Signature;
  serialize(compress?: boolean): Buffer;
  toHex(compress?: boolean): string;
  sigValidate(): void;
  isInfinity(): boolean;
  multiplyBy(randomBytes: BlstBuffer): Signature;
}

/**
 * Aggregates an array of PublicKeyArgs.  Can pass mixed deserialized PublicKey
 * objects and serialized Uint8Array in the `keys` array. Passing serialized
 * objects requires deserialization of the blst::P1
 *
 * @param {PublicKeyArg} keys - Array of public keys to aggregate
 *
 * @return {PublicKey} - Aggregated jacobian public key
 *
 * @throw {TypeError} - Invalid input
 * @throw {Error} - Invalid aggregation
 */
export declare function aggregatePublicKeys(keys: PublicKeyArg[]): PublicKey;

/**
 * Aggregates an array of SignatureArgs.  Can pass mixed deserialized Signature
 * objects and serialized Uint8Array in the `signatures` array. Passing serialized
 * objects requires deserialization of the blst::P2
 *
 * @param {SignatureArg} signatures - Array of signatures to aggregate
 *
 * @return {Signature} - Aggregated jacobian signature
 *
 * @throw {TypeError} - Invalid input
 * @throw {Error} - Invalid aggregation
 */
export declare function aggregateSignatures(signatures: SignatureArg[]): Signature;

/**
 * Bls verification of a set of messages, with corresponding public keys, and a single
 * aggregated signature.
 *
 * @param {BlstBuffer} msgs - Messages to verify
 * @param {PublicKeyArg} publicKeys - Corresponding public keys to verify against
 * @param {SignatureArg} signature - Aggregated signature of the message
 *
 * @return {boolean} - True if the signature is valid, false otherwise
 *
 * @throw {TypeError} - Invalid input
 * @throw {Error} - Invalid aggregation
 */
export declare function aggregateVerify(
  msgs: BlstBuffer[],
  publicKeys: PublicKeyArg[],
  signature: SignatureArg
): boolean;

/**
 * Bls batch verification for groups with a message and corresponding public key
 * and signature. Only returns true if all signatures are valid.
 *
 * @param {SignatureSet} signatureSets - Array of SignatureSet objects to batch verify
 *
 * @return {boolean} - True if all signatures are valid, false otherwise
 *
 * @throw {TypeError} - Invalid input
 * @throw {Error} - Invalid aggregation
 */
export declare function verifyMultipleAggregateSignatures(signatureSets: SignatureSet[]): boolean;

/**
 * Bls verification of a set of messages, with corresponding public keys, and a single
 * aggregated signature.
 *
 * @param {BlstBuffer} msgs - Messages to verify
 * @param {PublicKeyArg} publicKeys - Corresponding public keys to verify against
 * @param {SignatureArg} signature - Aggregated signature of the message
 *
 * @return {Promise<boolean>} - True if the signature is valid, false otherwise
 *
 * @throw {TypeError} - Invalid input
 * @throw {Error} - Invalid aggregation
 */
export declare function asyncAggregateVerify(
  msg: BlstBuffer[],
  publicKey: PublicKeyArg[],
  signature: SignatureArg
): Promise<boolean>;

/**
 * Bls batch verification for groups with a message and corresponding public key
 * and signature. Only returns true if all signatures are valid.
 *
 * @param {SignatureSet} signatureSets - Array of SignatureSet objects to batch verify
 *
 * @return {Promise<boolean>} - True if all signatures are valid, false otherwise
 *
 * @throw {TypeError} - Invalid input
 * @throw {Error} - Invalid aggregation
 */
export declare function asyncVerifyMultipleAggregateSignatures(signatureSets: SignatureSet[]): Promise<boolean>;

export interface BlstTsAddon {
  BLST_CONSTANTS: typeof BLST_CONSTANTS_TYPE;
  SecretKey: typeof SecretKey;
  PublicKey: typeof PublicKey;
  Signature: typeof Signature;
  aggregatePublicKeys: typeof aggregatePublicKeys;
  aggregateSignatures: typeof aggregateSignatures;
  aggregateVerify: typeof aggregateVerify;
  verifyMultipleAggregateSignatures: typeof verifyMultipleAggregateSignatures;
  asyncAggregateVerify: typeof asyncAggregateVerify;
  asyncVerifyMultipleAggregateSignatures: typeof asyncVerifyMultipleAggregateSignatures;
}

export interface BlstTs extends BlstTsAddon {
  CoordType: typeof CoordType;
  /**
   * Bls verification of a message against a public key and signature.
   *
   * @param {BlstBuffer} msg - Message to verify
   * @param {PublicKeyArg} publicKey - Public key to verify against
   * @param {SignatureArg} signature - Signature of the message
   *
   * @return {boolean} - True if the signature is valid, false otherwise
   *
   * @throw {TypeError} - Invalid input
   */
  verify(message: BlstBuffer, publicKey: PublicKeyArg, signature: SignatureArg): boolean;

  /**
   * Bls verification of a message against a public key and signature.
   *
   * @param {BlstBuffer} msg - Message to verify
   * @param {PublicKeyArg} publicKey - Public key to verify against
   * @param {SignatureArg} signature - Signature of the message
   *
   * @return {Promise<boolean>} - True if the signature is valid, false otherwise
   *
   * @throw {TypeError} - Invalid input
   */
  asyncVerify(message: BlstBuffer, publicKey: PublicKeyArg, signature: SignatureArg): Promise<boolean>;

  /**
   * Bls verification of a message against a set of public keys and an aggregated signature.
   *
   * @param {BlstBuffer} msg - Message to verify
   * @param {PublicKeyArg} publicKeys - Public keys to aggregate and verify against
   * @param {SignatureArg} signature - Aggregated signature of the message
   *
   * @return {boolean} - True if the signature is valid, false otherwise
   *
   * @throw {TypeError} - Invalid input
   * @throw {Error} - Invalid aggregation
   */
  fastAggregateVerify(message: BlstBuffer, publicKeys: PublicKeyArg[], signature: SignatureArg): boolean;

  /**
   * `rand` must not be exactly zero. Otherwise it would allow the verification of invalid signatures
   * See https://github.com/ChainSafe/blst-ts/issues/45
   *
   * @param {number} bytesCount - Number of bytes to generate
   *
   * @return {Buffer} - Random bytes
   */
  randomBytesNonZero(bytesCount: number): Buffer;

  /**
   * Bls verification of a message against a set of public keys and an aggregated signature.
   *
   * @param {BlstBuffer} msg - Message to verify
   * @param {PublicKeyArg} publicKeys - Public keys to aggregate and verify against
   * @param {SignatureArg} signature - Aggregated signature of the message
   *
   * @return {Promise<boolean>} - True if the signature is valid, false otherwise
   *
   * @throw {TypeError} - Invalid input
   * @throw {Error} - Invalid aggregation
   */
  asyncFastAggregateVerify(message: BlstBuffer, publicKeys: PublicKeyArg[], signature: SignatureArg): Promise<boolean>;
}
