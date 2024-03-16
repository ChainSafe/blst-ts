import crypto from "crypto";
import {SecretKey, Signature} from "../../lib";
import {NapiTestSet, SerializedSet} from "./types";

const DEFAULT_TEST_MESSAGE = Uint8Array.from(Buffer.from("test-message"));

export function buildTestSetFromMessage(message: Uint8Array = DEFAULT_TEST_MESSAGE): NapiTestSet {
  const secretKey = SecretKey.fromKeygen(crypto.randomBytes(32));
  return {
    message,
    secretKey,
    publicKey: secretKey.toPublicKey(),
    signature: secretKey.sign(message),
  };
}

const napiSets = new Map<number, NapiTestSet>();
function buildTestSet(i: number): NapiTestSet {
  const message = crypto.randomBytes(32);
  const set = buildTestSetFromMessage(message);
  napiSets.set(i, set);
  return set;
}

export function getTestSet(i: number = 1): NapiTestSet {
  const set = napiSets.get(i);
  if (set) {
    return set;
  }
  return buildTestSet(i);
}

export const commonMessage = crypto.randomBytes(32);

const commonNapiMessageSignatures = new Map<number, Signature>();
export function getTestSetSameMessage(i: number = 1): NapiTestSet {
  const set = getTestSet(i);
  let signature = commonNapiMessageSignatures.get(i);
  if (!signature) {
    signature = set.secretKey.sign(commonMessage);
    commonNapiMessageSignatures.set(i, signature);
  }
  return {
    message: commonMessage,
    secretKey: set.secretKey,
    publicKey: set.publicKey,
    signature,
  };
}

const serializedSets = new Map<number, SerializedSet>();
export function getSerializedTestSet(i: number = 1): SerializedSet {
  const set = serializedSets.get(i);
  if (set) {
    return set;
  }
  const deserialized = getTestSet(i);
  const serialized = {
    message: deserialized.message,
    secretKey: deserialized.secretKey.serialize(),
    publicKey: deserialized.publicKey.serialize(),
    signature: deserialized.signature.serialize(),
  };
  serializedSets.set(i, serialized);
  return serialized;
}
