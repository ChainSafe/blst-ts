import {randomBytes} from "crypto";
import getBindings from "bindings";
import {BlstBindings, CoordType, BINDINGS_NAME} from "./bindings";
import type {BlstBuffer, PublicKeyArg, SignatureArg, SignatureSet, Serializable} from "./bindings";

const {
  BLST_CONSTANTS,
  PublicKey,
  SecretKey,
  Signature,
  aggregatePublicKeys,
  aggregateSignatures,
  aggregateVerify,
  verifyMultipleAggregateSignatures,
  asyncAggregateVerify,
  asyncVerifyMultipleAggregateSignatures,
}: BlstBindings = getBindings(BINDINGS_NAME);

SecretKey.prototype.toHex = function () {
  return `0x${this.serialize().toString("hex")}`;
};

PublicKey.prototype.toHex = function (compress) {
  return `0x${this.serialize(compress).toString("hex")}`;
};

Signature.prototype.toHex = function (compress) {
  return `0x${this.serialize(compress).toString("hex")}`;
};

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
export function verify(message: BlstBuffer, publicKey: PublicKeyArg, signature: SignatureArg): boolean {
  return aggregateVerify([message], [publicKey], signature);
}

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
export function asyncVerify(message: BlstBuffer, publicKey: PublicKeyArg, signature: SignatureArg): Promise<boolean> {
  return asyncAggregateVerify([message], [publicKey], signature);
}

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
export function fastAggregateVerify(message: BlstBuffer, publicKeys: PublicKeyArg[], signature: SignatureArg): boolean {
  let key;
  try {
    // this throws for invalid key, catch and return false
    key = aggregatePublicKeys(publicKeys);
  } catch {
    return false;
  }
  return aggregateVerify([message], [key], signature);
}

/**
 * `rand` must not be exactly zero. Otherwise it would allow the verification of invalid signatures
 * See https://github.com/ChainSafe/blst-ts/issues/45
 *
 * @param {number} bytesCount - Number of bytes to generate
 *
 * @return {Buffer} - Random bytes
 */
export function randomBytesNonZero(bytesCount: number): Buffer {
  const rand = randomBytes(bytesCount);
  for (let i = 0; i < bytesCount; i++) {
    if (rand[i] !== 0) return rand;
  }
  rand[0] = 1;
  return rand;
}

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
export function asyncFastAggregateVerify(
  message: BlstBuffer,
  publicKeys: PublicKeyArg[],
  signature: SignatureArg
): Promise<boolean> {
  let key;
  try {
    // this throws for invalid key, catch and return false
    key = aggregatePublicKeys(publicKeys);
  } catch {
    return Promise.resolve(false);
  }
  return asyncAggregateVerify([message], [key], signature);
}

export {
  CoordType,
  BlstBuffer,
  PublicKeyArg,
  SignatureArg,
  SignatureSet,
  Serializable,
  BLST_CONSTANTS,
  PublicKey,
  SecretKey,
  Signature,
  aggregatePublicKeys,
  aggregateSignatures,
  aggregateVerify,
  verifyMultipleAggregateSignatures,
  asyncAggregateVerify,
  asyncVerifyMultipleAggregateSignatures,
};
