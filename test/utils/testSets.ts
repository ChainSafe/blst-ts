import crypto from "crypto";
import {SecretKey, Signature, BLST_CONSTANTS} from "../../lib";
import {TestSet, SerializedSet} from "./types";
import {arrayOfIndexes} from "./helpers";

const DEFAULT_TEST_MESSAGE = Uint8Array.from(Buffer.from("test-message"));

export function buildTestSetFromMessage(message: Uint8Array = DEFAULT_TEST_MESSAGE): TestSet {
  const secretKey = SecretKey.fromKeygen(crypto.randomBytes(BLST_CONSTANTS.SECRET_KEY_LENGTH));
  const publicKey = secretKey.toPublicKey();
  const signature = secretKey.sign(message);
  try {
    publicKey.keyValidate();
  } catch {
    console.log(">>>\n>>>\n>>> Invalid Key Found in a TestSet\n>>>\n>>>");
    return buildTestSetFromMessage(message);
  }
  try {
    signature.sigValidate();
  } catch {
    console.log(">>>\n>>>\n>>> Invalid Signature Found in a TestSet\n>>>\n>>>");
    return buildTestSetFromMessage(message);
  }
  return {
    message,
    secretKey,
    publicKey,
    signature,
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
    signature = set.secretKey.sign(commonMessage);
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
    secretKey: deserialized.secretKey.serialize(),
    publicKey: deserialized.publicKey.serialize(),
    signature: deserialized.signature.serialize(),
  };
  serializedSets.set(i, serialized);
  return serialized;
}
