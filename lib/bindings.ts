import {randomBytes} from "node:crypto";
import type {
  CoordType,
  BLST_CONSTANTS,
  SecretKey,
  PublicKey,
  Signature,
  aggregatePublicKeys,
  aggregateSignatures,
  aggregateWithRandomness,
  asyncAggregateWithRandomness,
  verify,
  asyncVerify,
  aggregateVerify,
  asyncAggregateVerify,
  fastAggregateVerify,
  asyncFastAggregateVerify,
  verifyMultipleAggregateSignatures,
  asyncVerifyMultipleAggregateSignatures,
  randomBytesNonZero,
} from "./index.d";

export interface BlstTsAddon {
  BLST_CONSTANTS: typeof BLST_CONSTANTS;
  SecretKey: typeof SecretKey;
  PublicKey: typeof PublicKey;
  Signature: typeof Signature;
  aggregatePublicKeys: typeof aggregatePublicKeys;
  aggregateSignatures: typeof aggregateSignatures;
  aggregateWithRandomness: typeof aggregateWithRandomness;
  asyncAggregateWithRandomness: typeof asyncAggregateWithRandomness;
  aggregateVerify: typeof aggregateVerify;
  asyncAggregateVerify: typeof asyncAggregateVerify;
  verifyMultipleAggregateSignatures: typeof verifyMultipleAggregateSignatures;
  asyncVerifyMultipleAggregateSignatures: typeof asyncVerifyMultipleAggregateSignatures;
}

export interface BlstTs {
  BLST_CONSTANTS: typeof BLST_CONSTANTS;
  CoordType: typeof CoordType;
  SecretKey: typeof SecretKey;
  PublicKey: typeof PublicKey;
  Signature: typeof Signature;
  aggregatePublicKeys: typeof aggregatePublicKeys;
  aggregateSignatures: typeof aggregateSignatures;
  aggregateWithRandomness: typeof aggregateWithRandomness;
  asyncAggregateWithRandomness: typeof asyncAggregateWithRandomness;
  aggregateVerify: typeof aggregateVerify;
  asyncAggregateVerify: typeof asyncAggregateVerify;
  verifyMultipleAggregateSignatures: typeof verifyMultipleAggregateSignatures;
  asyncVerifyMultipleAggregateSignatures: typeof asyncVerifyMultipleAggregateSignatures;
  verify: typeof verify;
  asyncVerify: typeof asyncVerify;
  fastAggregateVerify: typeof fastAggregateVerify;
  asyncFastAggregateVerify: typeof asyncFastAggregateVerify;
  randomBytesNonZero: typeof randomBytesNonZero;
}

export function prepareBindings(bindings: BlstTsAddon): BlstTs {
  bindings.SecretKey.prototype.toHex = function toHex() {
    const uint8 = this.serialize();
    return `0x${Buffer.from(uint8.buffer, uint8.byteOffset, uint8.byteLength).toString("hex")}`;
  };

  bindings.PublicKey.prototype.toHex = function toHex(compress) {
    const uint8 = this.serialize(compress);
    return `0x${Buffer.from(uint8.buffer, uint8.byteOffset, uint8.byteLength).toString("hex")}`;
  };

  bindings.Signature.prototype.toHex = function toHex(compress) {
    const uint8 = this.serialize(compress);
    return `0x${Buffer.from(uint8.buffer, uint8.byteOffset, uint8.byteLength).toString("hex")}`;
  };

  return {
    ...bindings,
    CoordType: {
      affine: 0,
      jacobian: 1,
    },
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
