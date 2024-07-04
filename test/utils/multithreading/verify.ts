import {
  PublicKey,
  Signature,
  aggregatePublicKeys,
  verify,
  verifyMultipleAggregateSignatures,
} from "../../../index.js";
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
      pk: getAggregatePublicKey(set),
      msg: set.signingRoot.valueOf(),
      sig: Signature.fromBytes(set.signature),
    }));

    if (sets.length >= MIN_SET_COUNT_TO_BATCH) {
      return verifyMultipleAggregateSignatures(aggregatedSets);
    }

    if (sets.length === 0) {
      throw Error("Empty signature set");
    }

    return aggregatedSets.every((set) => verify(set.msg, set.pk, set.sig));
  } catch {
    return false;
  }
}
