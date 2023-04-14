import {expect} from "chai";
import {randomFillSync} from "crypto";
import {BlstBuffer, Serializable, SecretKey, PublicKey, Signature} from "../lib";

type Bufferish = BlstBuffer | Serializable;

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

export function getFilledUint8(length: number, fillWith: string | number | Buffer = "*"): Uint8Array {
  return Uint8Array.from(Buffer.alloc(length, fillWith));
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

const DEFAULT_TEST_MESSAGE = Uint8Array.from(Buffer.from("test-message"));

export interface NapiTestSet {
  msg: Uint8Array;
  secretKey: SecretKey;
  publicKey: PublicKey;
  signature: Signature;
}

export function makeNapiTestSet(msg: Uint8Array): NapiTestSet {
  const secretKey = SecretKey.fromKeygenSync(randomFillSync(Buffer.alloc(32)));
  const publicKey = secretKey.toPublicKey();
  const signature = secretKey.signSync(msg);
  return {
    msg,
    secretKey,
    publicKey,
    signature,
  };
}

export function makeNapiTestSets(numSets: number, msg = DEFAULT_TEST_MESSAGE): NapiTestSet[] {
  const sets: NapiTestSet[] = [];
  for (let i = 0; i < numSets; i++) {
    sets.push(makeNapiTestSet(msg));
  }
  return sets;
}

export function linspace(start: number, stop: number): number[] {
  const arr: number[] = [];
  for (let i = start; i <= stop; i++) arr.push(i);
  return arr;
}
