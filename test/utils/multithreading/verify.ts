import {
  PublicKey,
  Signature,
  SignatureSet,
  aggregatePublicKeys,
  asyncVerify,
  asyncVerifyMultipleAggregateSignatures,
  verify,
  verifyMultipleAggregateSignatures,
} from "../../../rebuild/lib";
import {ISignatureSet, SignatureSetType} from "./types";

const MIN_SET_COUNT_TO_BATCH = 2;

export function getAggregatePublicKey(set: ISignatureSet): PublicKey {
  switch (set.type) {
    case SignatureSetType.single:
      return set.pubkey;

    case SignatureSetType.aggregate:
      return aggregatePublicKeys(set.pubkeys);

    default:
      throw Error("Unknown signature set type");
  }
}

export function verifySignatureSets(sets: ISignatureSet[]): boolean {
  try {
    const aggregatedSets = sets.map((set) => ({
      publicKey: getAggregatePublicKey(set),
      message: set.signingRoot.valueOf(),
      signature: Signature.deserialize(set.signature),
    }));

    if (sets.length >= MIN_SET_COUNT_TO_BATCH) {
      return verifyMultipleAggregateSignatures(aggregatedSets);
    }

    if (sets.length === 0) {
      throw Error("Empty signature set");
    }

    return aggregatedSets.every((set) => verify(set.message, set.publicKey, set.signature));
  } catch {
    return false;
  }
}

export async function asyncVerifyNapiSignatureSets(sets: SignatureSet[]): Promise<boolean> {
  try {
    if (sets.length >= MIN_SET_COUNT_TO_BATCH) {
      return await asyncVerifyMultipleAggregateSignatures(sets);
    }

    if (sets.length === 0) {
      throw Error("Empty signature set");
    }

    const verifications = await Promise.all(
      sets.map((set) => asyncVerify(set.message, set.publicKey, set.signature).catch(() => false))
    );

    return verifications.every((v) => v);
  } catch {
    return false;
  }
}
