import * as swig from "../../../src";
import napi from "../../../lib";
import {PublicKey} from "../types";
import {ISignatureSet, SignatureSetType} from "./types";

const MIN_SET_COUNT_TO_BATCH = 2;

export function getAggregatePublicKey(set: ISignatureSet, isSwig: true): swig.PublicKey;
export function getAggregatePublicKey(set: ISignatureSet, isSwig: false): napi.PublicKey;
export function getAggregatePublicKey<T extends boolean>(set: ISignatureSet, isSwig: T): PublicKey {
  switch (set.type) {
    case SignatureSetType.single:
      return set.pubkey;

    case SignatureSetType.aggregate:
      return isSwig
        ? swig.aggregatePubkeys(set.pubkeys as swig.PublicKey[])
        : napi.aggregatePublicKeys(set.pubkeys as napi.PublicKey[]);

    default:
      throw Error("Unknown signature set type");
  }
}

export function verifySignatureSets(sets: ISignatureSet[], isSwig: boolean): boolean {
  return isSwig
    ? verifySwigSignatureSets(
        sets.map((set) => ({
          pk: getAggregatePublicKey(set, isSwig),
          msg: set.signingRoot.valueOf(),
          sig: swig.Signature.fromBytes(set.signature),
        }))
      )
    : verifyNapiSignatureSets(
        sets.map((set) => ({
          publicKey: getAggregatePublicKey(set, isSwig),
          message: set.signingRoot.valueOf(),
          signature: napi.Signature.deserialize(set.signature),
        }))
      );
}

export function verifySwigSignatureSets(sets: swig.SignatureSet[]): boolean {
  try {
    if (sets.length >= MIN_SET_COUNT_TO_BATCH) {
      return swig.verifyMultipleAggregateSignatures(sets);
    }

    if (sets.length === 0) {
      throw Error("Empty signature set");
    }

    return sets.every((set) => swig.verify(set.msg, set.pk, set.sig));
  } catch {
    return false;
  }
}

export function verifyNapiSignatureSets(sets: napi.SignatureSet[]): boolean {
  try {
    if (sets.length >= MIN_SET_COUNT_TO_BATCH) {
      return napi.verifyMultipleAggregateSignatures(sets);
    }

    if (sets.length === 0) {
      throw Error("Empty signature set");
    }

    return sets.every((set) => napi.verify(set.message, set.publicKey, set.signature));
  } catch {
    return false;
  }
}

export async function asyncVerifyNapiSignatureSets(sets: napi.SignatureSet[]): Promise<boolean> {
  try {
    if (sets.length >= MIN_SET_COUNT_TO_BATCH) {
      return await napi.asyncVerifyMultipleAggregateSignatures(sets);
    }

    if (sets.length === 0) {
      throw Error("Empty signature set");
    }

    const verifications = await Promise.all(
      sets.map((set) => napi.asyncVerify(set.message, set.publicKey, set.signature).catch(() => false))
    );

    return verifications.every((v) => v);
  } catch {
    return false;
  }
}
