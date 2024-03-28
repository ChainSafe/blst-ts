import type {
  CoordType,
  BLST_CONSTANTS_TYPE,
  PublicKey,
  SecretKey,
  Signature,
  aggregatePublicKeys,
  aggregateSignatures,
  aggregateVerify,
  verifyMultipleAggregateSignatures,
  asyncAggregateVerify,
  asyncVerifyMultipleAggregateSignatures,
  verify,
  asyncVerify,
  fastAggregateVerify,
  randomBytesNonZero,
  asyncFastAggregateVerify,
} from "./types";
import {randomBytes} from "node:crypto";

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

/**
 * BlstTs interface extends the BlstTsAddon interface. Not all of the functions
 * were implemented in the native bindings, and we finished those declarations
 * on the TS side
 */
export interface BlstTs extends BlstTsAddon {
  CoordType: typeof CoordType;
  verify: typeof verify;
  asyncVerify: typeof asyncVerify;
  fastAggregateVerify: typeof fastAggregateVerify;
  randomBytesNonZero: typeof randomBytesNonZero;
  asyncFastAggregateVerify: typeof asyncFastAggregateVerify;
}

export function prepareBindings(bindings: BlstTsAddon): BlstTs {
  bindings.SecretKey.prototype.toHex = function toHex() {
    return `0x${this.serialize().toString("hex")}`;
  };

  bindings.PublicKey.prototype.toHex = function toHex(compress) {
    return `0x${this.serialize(compress).toString("hex")}`;
  };

  bindings.Signature.prototype.toHex = function toHex(compress) {
    return `0x${this.serialize(compress).toString("hex")}`;
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
