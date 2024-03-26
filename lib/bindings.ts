import {randomBytes} from "node:crypto";
import type {BlstBuffer, BlstTsAddon, PublicKeyArg, SignatureArg} from "./types";

/**
 * Enum value to specify the coordinate type of a point. The native side of the
 * library expects this to be passed as integers, with affine being 0 and
 * jacobian being 1.
 */
export enum CoordType {
  affine = 0,
  jacobian = 1,
}

/**
 * BlstTs interface extends the BlstTsAddon interface. Not all of the functions
 * were implemented in the native bindings, and we finished those declarations
 * on the TS side
 */
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

export function prepareBindings(bindings: BlstTsAddon): BlstTs {
  bindings.SecretKey.prototype.toHex = function toHex() {
    return `0x${this.serialize().toString("hex")}`;
  };

  bindings.PublicKey.prototype.toHex = function toHex(compress: boolean) {
    return `0x${this.serialize(compress).toString("hex")}`;
  };

  bindings.Signature.prototype.toHex = function toHex(compress: boolean) {
    return `0x${this.serialize(compress).toString("hex")}`;
  };

  return {
    ...bindings,
    CoordType,
    randomBytesNonZero(bytesCount) {
      const rand = randomBytes(bytesCount);
      for (let i = 0; i < bytesCount; i++) {
        if (rand[i] !== 0) return rand;
      }
      rand[0] = 1;
      return rand;
    },
    verify(message, publicKey, signature) {
      return bindings.aggregateVerify([message], [publicKey], signature);
    },
    asyncVerify(message, publicKey, signature) {
      return bindings.asyncAggregateVerify([message], [publicKey], signature);
    },
    fastAggregateVerify(message, publicKeys, signature) {
      let key;
      try {
        // this throws for invalid key, catch and return false
        key = bindings.aggregatePublicKeys(publicKeys);
      } catch {
        return false;
      }
      return bindings.aggregateVerify([message], [key], signature);
    },
    asyncFastAggregateVerify(message, publicKeys, signature) {
      let key;
      try {
        // this throws for invalid key, catch and return false
        key = bindings.aggregatePublicKeys(publicKeys);
      } catch {
        return Promise.resolve(false);
      }
      return bindings.asyncAggregateVerify([message], [key], signature);
    },
  };
}

// export interface SecretKeyConstructor {
//   new (): SecretKey;
//   /**
//    * Convert a serialized secret key into a SecretKey object.
//    */
//   deserialize(skBytes: BlstBuffer): SecretKey;
//   /**
//    * `fromKeygen` takes two parameters. The first parameter is a salt and is
//    * required. IKM MUST be at least 32 bytes long, but it MAY be longer. The
//    * second parameter, info, is optional and may be used to derive multiple
//    * independent keys from the same IKM. By default, info is the empty string.
//    */
//   fromKeygen(ikm: BlstBuffer, info?: string): SecretKey;
// }

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
// export declare class SecretKey implements Serializable {
//   private constructor();
//   /**
//    * Convert a serialized secret key into a SecretKey object.
//    */
//   static deserialize(skBytes: BlstBuffer): SecretKey;
//   /**
//    * `fromKeygen` takes two parameters. The first parameter is a salt and is
//    * required. IKM MUST be at least 32 bytes long, but it MAY be longer. The
//    * second parameter, info, is optional and may be used to derive multiple
//    * independent keys from the same IKM. By default, info is the empty string.
//    */
//   static fromKeygen(ikm: BlstBuffer, info?: string): SecretKey;
//   /**
//    * Serialize a secret key into a Buffer.
//    */
//   serialize(): Buffer;
//   toHex(): string;
//   toPublicKey(): PublicKey;
//   sign(msg: BlstBuffer): Signature;
// }

// export interface PublicKeyConstructor {
//   new (): PublicKey;
//   /**
//    * Convert a serialized public key into a PublicKey object.
//    */
//   deserialize(pkBytes: BlstBuffer, coordType?: CoordType): PublicKey;
// }

// export declare class PublicKey implements Serializable {
//   private constructor();
//   /**
//    * Convert a serialized public key into a PublicKey object.
//    */
//   static deserialize(pkBytes: BlstBuffer, coordType?: CoordType): PublicKey;
//   serialize(compress?: boolean): Buffer;
//   toHex(compress?: boolean): string;
//   keyValidate(): void;
//   isInfinity(): boolean;
//   multiplyBy(randomBytes: BlstBuffer): PublicKey;
// }

// export interface SignatureConstructor {
//   new (): Signature;
//   /**
//    * Convert a serialized signature into a Signature object.
//    */
//   deserialize(sigBytes: BlstBuffer, coordType?: CoordType): Signature;
// }

// export declare class Signature implements Serializable {
//   private constructor();
//   /**
//    * Convert a serialized signature into a Signature object.
//    */
//   static deserialize(sigBytes: BlstBuffer, coordType?: CoordType): Signature;
//   serialize(compress?: boolean): Buffer;
//   toHex(compress?: boolean): string;
//   sigValidate(): void;
//   isInfinity(): boolean;
//   multiplyBy(randomBytes: BlstBuffer): Signature;
// }
