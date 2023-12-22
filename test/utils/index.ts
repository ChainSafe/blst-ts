/* eslint-disable import/no-named-as-default-member */
import crypto from "crypto";
import {expect} from "chai";
import * as swig from "../../src";
import * as napi from "../../rebuild/lib";
import {
  AggregatedSignatureSet,
  Bufferish,
  NapiAggregatedSignatureSet,
  NapiSet,
  NapiSingleSignatureSet,
  SerializedSet,
  SignatureSetType,
  SingleSignatureSet,
  SwigAggregatedSignatureSet,
  SwigSet,
  SwigSingleSignatureSet,
} from "./multithreading/types";

export {BlsMultiThreadWorkerPool} from "./multithreading";
export * from "./multithreading/types";

export function toHex(bytes: Bufferish): string {
  const hex = toHexNoPrefix(bytes);
  if (hex.startsWith("0x")) return hex;
  else return "0x" + hex;
}

function toHexNoPrefix(bytes: Bufferish): string {
  if (typeof bytes === "string") return bytes;
  if (bytes instanceof Uint8Array) return Buffer.from(bytes).toString("hex");
  if (typeof bytes.serialize === "function") return Buffer.from(bytes.serialize()).toString("hex");
  throw Error("Unknown arg");
}

export function expectHex(value: Bufferish, expected: Bufferish): void {
  expect(toHexNoPrefix(value)).to.equal(toHexNoPrefix(expected));
}

export function fromHex(hexString: string): Uint8Array {
  if (hexString.startsWith("0x")) hexString = hexString.slice(2);
  return Buffer.from(hexString, "hex");
}

/**
 * Enforce tests for all instance methods
 */
export type InstanceTestCases<InstanceType extends {[key: string]: any}> = {
  [P in keyof Omit<InstanceType, "type">]: {
    id?: string;
    instance?: InstanceType;
    args: Parameters<InstanceType[P]>;
    res?: ReturnType<InstanceType[P]>;
  }[];
};

/**
 * Enforce tests for all instance methods and run them
 */
export function runInstanceTestCases<InstanceType extends {[key: string]: any}>(
  instanceTestCases: InstanceTestCases<InstanceType>,
  getInstance: () => InstanceType
): void {
  for (const [key, testCases] of Object.entries(instanceTestCases)) {
    const methodKey = key as keyof InstanceType;
    for (const testCase of testCases) {
      it(`${String(methodKey)}: ${testCase.id || ""}`, () => {
        // Get a new fresh instance for this test
        const instance = testCase.instance || getInstance();
        if (typeof instance[methodKey] !== "function") throw Error(`Method ${String(methodKey)} does not exist`);
        const res = (instance[methodKey] as (...args: any) => any)(...testCase.args);
        if (!res) {
          // OK
        } else if (res.serialize || res instanceof Uint8Array) {
          expectHex(res, testCase.res);
        } else {
          expect(res).to.deep.equal(testCase.res);
        }
      });
    }
  }
}

export function arrayOfIndexes(start: number, end: number): number[] {
  const arr: number[] = [];
  for (let i = start; i <= end; i++) arr.push(i);
  return arr;
}

export const commonMessage = crypto.randomBytes(32);

// Create and cache (on demand) crypto data to benchmark
const napiSets = new Map<number, NapiSet>();
function buildNapiSet(i: number): NapiSet {
  const message = crypto.randomBytes(32);
  const secretKey = napi.SecretKey.fromKeygen(crypto.randomBytes(32));
  const set = {
    message,
    secretKey,
    publicKey: secretKey.toPublicKey(),
    signature: secretKey.sign(message),
  };
  napiSets.set(i, set);
  return set;
}

export function getNapiSet(i: number): NapiSet {
  const set = napiSets.get(i);
  if (set) {
    return set;
  }
  return buildNapiSet(i);
}

const commonNapiMessageSignatures = new Map<number, napi.Signature>();
export function getNapiSetSameMessage(i: number): NapiSet {
  const set = getNapiSet(i);
  set.message = commonMessage;
  const signature = commonNapiMessageSignatures.get(i);
  if (signature) {
    set.signature = signature;
  } else {
    set.signature = set.secretKey.sign(commonMessage);
    commonNapiMessageSignatures.set(i, set.signature);
  }
  return set;
}

const swigSets = new Map<number, SwigSet>();
function buildSwigSet(i: number): SwigSet {
  const message = crypto.randomBytes(32);
  const secretKey = swig.SecretKey.fromKeygen(crypto.randomBytes(32));
  const set = {
    msg: message,
    sk: secretKey,
    pk: secretKey.toPublicKey(),
    sig: secretKey.sign(message),
  };
  swigSets.set(i, set);
  return set;
}

export function getSwigSet(i: number): SwigSet {
  const set = swigSets.get(i);
  if (set) {
    return set;
  }
  return buildSwigSet(i);
}

const commonSwigMessageSignatures = new Map<number, swig.Signature>();
export function getSwigSetSameMessage(i: number): SwigSet {
  const set = getSwigSet(i);
  set.msg = commonMessage;
  const signature = commonSwigMessageSignatures.get(i);
  if (signature) {
    set.sig = signature;
  } else {
    set.sig = set.sk.sign(commonMessage);
    commonSwigMessageSignatures.set(i, set.sig);
  }
  return set;
}

const serializedSets = new Map<number, SerializedSet>();
export function getSerializedSet(i: number): SerializedSet {
  const set = serializedSets.get(i);
  if (set) {
    return set;
  }
  const deserialized = buildNapiSet(i);
  const serialized = {
    message: deserialized.message,
    secretKey: deserialized.secretKey.serialize(),
    publicKey: deserialized.publicKey.serialize(),
    signature: deserialized.signature.serialize(),
  };
  serializedSets.set(i, serialized);
  return serialized;
}

export const keygenMaterial = crypto.randomBytes(32);

export function getAggregatedSignatureSets<
  T extends boolean,
  R extends AggregatedSignatureSet[] = T extends true ? SwigAggregatedSignatureSet[] : NapiAggregatedSignatureSet[],
>(count: number, pubKeyCount: number, isSwig: T): R {
  const sets = [] as unknown as R;
  for (let i = 0; i < count; i++) {
    const aggregated = [] as (SwigSet | NapiSet)[];
    for (let j = 0; j < pubKeyCount; j++) {
      const set = isSwig ? getSwigSet(i + j) : getNapiSet(i + j);
      aggregated.push(set);
    }

    const sigs = aggregated.map((set) => (isSwig ? (set as SwigSet).sig : (set as NapiSet).signature));
    const signature = isSwig
      ? swig.aggregateSignatures(sigs as swig.Signature[]).toBytes()
      : napi.aggregateSignatures(sigs as napi.Signature[]).serialize();

    sets.push({
      type: SignatureSetType.aggregate,
      pubkeys: aggregated.map((set) => (isSwig ? (set as SwigSet).pk : (set as NapiSet).publicKey)) as any,
      signingRoot: commonMessage,
      signature,
    });
  }
  return sets;
}

export function getGroupsOfAggregatedSignatureSets<T extends boolean>(
  numGroups: number,
  count: number,
  pubKeyCount: number,
  isSwig: T
): AggregatedSignatureSet[][] {
  const groups = [] as AggregatedSignatureSet[][];
  for (let i = 0; i < numGroups; i++) {
    groups.push(getAggregatedSignatureSets(count, pubKeyCount, isSwig));
  }
  return groups;
}

export function getSingleSignatureSets<T extends boolean>(count: number, isSwig: T): SingleSignatureSet[] {
  const sets = [] as SingleSignatureSet[];

  for (let i = 0; i < count; i++) {
    const set = isSwig ? getSwigSet(i) : getNapiSet(i);
    sets.push({
      type: SignatureSetType.single,
      pubkey: isSwig ? (set as SwigSet).pk : (set as NapiSet).publicKey,
      signingRoot: commonMessage,
      signature: isSwig ? (set as SwigSet).sig.toBytes() : (set as NapiSet).signature.serialize(),
    });
  }

  return sets;
}

export function getGroupsOfSingleSignatureSets<T extends boolean>(
  numGroups: number,
  count: number,
  isSwig: T
): SingleSignatureSet[][] {
  const groups = [] as SingleSignatureSet[][];
  for (let i = 0; i < numGroups; i++) {
    groups.push(getSingleSignatureSets(count, isSwig));
  }
  return groups;
}

type SwigSignatureSetGroups = (SwigSingleSignatureSet[] | SwigAggregatedSignatureSet[])[];
type NapiSignatureSetGroups = (NapiSingleSignatureSet[] | NapiAggregatedSignatureSet[])[];
export function shuffle(array: any[]): any[] {
  let currentIndex = array.length,
    randomIndex;

  while (currentIndex != 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }

  return array;
}

export function getGroupsOfSignatureSets<T extends boolean>(
  isSwig: T,
  countPerGroup: number,
  singleGroups: number,
  aggregatedGroups: number,
  pubKeyCount: number
): T extends true ? SwigSignatureSetGroups : NapiSignatureSetGroups {
  const single = getGroupsOfSingleSignatureSets(singleGroups, countPerGroup, isSwig);
  const aggregated = getGroupsOfAggregatedSignatureSets(aggregatedGroups, countPerGroup, pubKeyCount, isSwig);
  return shuffle([...single, ...aggregated]) as T extends true ? SwigSignatureSetGroups : NapiSignatureSetGroups;
}
