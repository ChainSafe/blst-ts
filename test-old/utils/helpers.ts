import crypto from "crypto";
import {expect} from "chai";
import * as swig from "../../src";
import * as napi from "../../lib";
import {Bufferish, InstanceTestCases, NapiSet, SwigSet} from "./types";

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

export function arrayOfIndexes(start: number, end: number): number[] {
  const arr: number[] = [];
  for (let i = start; i <= end; i++) arr.push(i);
  return arr;
}

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

const napiSets = new Map<number, NapiSet>();
export function buildNapiSet(i: number): NapiSet {
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

const swigSets = new Map<number, SwigSet>();
export function buildSwigSet(i: number): SwigSet {
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
