import crypto from "crypto";
import {SECRET_KEY_LENGTH, SecretKey, Signature} from "../../index.js";
import {TestSet, SerializedSet, SameMessageTestSets} from "./types";
import {arrayOfIndexes} from "./helpers";

const DEFAULT_TEST_MESSAGE = Uint8Array.from(Buffer.from("test-message"));

export function buildTestSetFromMessage(msg: Uint8Array = DEFAULT_TEST_MESSAGE): TestSet {
  const sk = SecretKey.fromKeygen(crypto.randomBytes(SECRET_KEY_LENGTH));
  const pk = sk.toPublicKey();
  const sig = sk.sign(msg);
  try {
    pk.keyValidate();
  } catch {
    console.log(">>>\n>>>\n>>> Invalid Key Found in a TestSet\n>>>\n>>>");
    return buildTestSetFromMessage(msg);
  }
  try {
    sig.sigValidate();
  } catch {
    console.log(">>>\n>>>\n>>> Invalid Signature Found in a TestSet\n>>>\n>>>");
    return buildTestSetFromMessage(msg);
  }
  return {
    msg,
    sk,
    pk,
    sig,
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
  let sig = commonMessageSignatures.get(i);
  if (!sig) {
    sig = set.sk.sign(commonMessage);
    commonMessageSignatures.set(i, sig);
  }
  return {
    msg: commonMessage,
    sk: set.sk,
    pk: set.pk,
    sig,
  };
}

export function getTestSetsSameMessage(count: number): SameMessageTestSets {
  const sets = arrayOfIndexes(0, count - 1).map(getTestSetSameMessage);
  return {
    msg: sets[0].msg,
    sets: sets.map(({sk, pk, sig}) => ({sk, pk, sig})),
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
    msg: deserialized.msg,
    sk: deserialized.sk.toBytes(),
    pk: deserialized.pk.toBytes(),
    sig: deserialized.sk.toBytes(),
  };
  serializedSets.set(i, serialized);
  return serialized;
}
