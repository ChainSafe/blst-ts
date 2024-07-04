import crypto from "crypto";
import {SecretKey, Signature} from "../../index.js";
import {TestSet, SerializedSet} from "./types";
import {arrayOfIndexes} from "./helpers";

const DEFAULT_TEST_MESSAGE = Uint8Array.from(Buffer.from("test-message"));

export function buildTestSetFromMessage(message: Uint8Array = DEFAULT_TEST_MESSAGE): TestSet {
  const secretKey = SecretKey.fromKeygen(crypto.randomBytes(32));
  return {
    message,
    secretKey,
    publicKey: secretKey.toPublicKey(),
    signature: secretKey.sign(message),
  };
}

const testSets = new Map<number, TestSet>();
function buildTestSet(i: number): TestSet {
  const message = crypto.randomBytes(32);
  const set = buildTestSetFromMessage(message);
  testSets.set(i, set);
  return set;
}

export function getTestSet(i: number = 0): TestSet {
  const set = testSets.get(i);
  if (set) {
    return set;
  }
  return buildTestSet(i);
}

export function getTestSets(count: number): TestSet[] {
  return arrayOfIndexes(0, count - 1).map(getTestSet);
}

export const commonMessage = crypto.randomBytes(32);

const commonMessageSignatures = new Map<number, Signature>();
export function getTestSetSameMessage(i: number = 1): TestSet {
  const set = getTestSet(i);
  let signature = commonMessageSignatures.get(i);
  if (!signature) {
    signature = set.secretKey.sign(commonMessage) as Signature;
    commonMessageSignatures.set(i, signature);
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
    secretKey: deserialized.secretKey.toBytes(),
    publicKey: deserialized.publicKey.toBytes(),
    signature: deserialized.signature.toBytes(),
  };
  serializedSets.set(i, serialized);
  return serialized;
}
