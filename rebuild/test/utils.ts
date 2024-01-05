import {expect} from "chai";
import {randomFillSync} from "crypto";
import * as bindings from "../lib/index.js";
import {BufferLike, NapiTestSet} from "./types.js";

function toHexString(bytes: BufferLike): string {
  if (typeof bytes === "string") return bytes;
  if (bytes instanceof Buffer) return bytes.toString("hex");
  if (bytes instanceof Uint8Array) return Buffer.from(bytes).toString("hex");
  throw Error("toHexString only accepts BufferLike types");
}

export function toHex(bytes: BufferLike): string {
  const hex = toHexString(bytes);
  if (hex.startsWith("0x")) return hex;
  return "0x" + hex;
}

export function isEqualBytes(value: BufferLike, expected: BufferLike): boolean {
  return toHex(value) === toHex(expected);
}

export function expectEqualHex(value: BufferLike, expected: BufferLike): void {
  expect(toHex(value)).to.equal(toHex(expected));
}

export function expectNotEqualHex(value: BufferLike, expected: BufferLike): void {
  expect(toHex(value)).to.not.equal(toHex(expected));
}

export function fromHex(hexString: string): Uint8Array {
  if (hexString.startsWith("0x")) hexString = hexString.slice(2);
  return Buffer.from(hexString, "hex");
}

export function getFilledUint8(length: number, fillWith: string | number | Buffer = "*"): Uint8Array {
  return Uint8Array.from(Buffer.alloc(length, fillWith));
}

export function sullyUint8Array(bytes: Uint8Array): Uint8Array {
  return Uint8Array.from(
    Buffer.from([...Uint8Array.prototype.slice.call(bytes, 8), ...Buffer.from("0123456789abcdef", "hex")])
  );
}

const DEFAULT_TEST_MESSAGE = Uint8Array.from(Buffer.from("test-message"));

export function makeNapiTestSet(message: Uint8Array = DEFAULT_TEST_MESSAGE): NapiTestSet {
  const secretKey = bindings.SecretKey.fromKeygen(randomFillSync(Buffer.alloc(32)));
  const publicKey = secretKey.toPublicKey();
  const signature = secretKey.sign(message);
  return {
    message,
    secretKey,
    publicKey,
    signature,
  };
}

export function makeNapiTestSets(numSets: number, message = DEFAULT_TEST_MESSAGE): NapiTestSet[] {
  const sets: NapiTestSet[] = [];
  for (let i = 0; i < numSets; i++) {
    sets.push(makeNapiTestSet(message));
  }
  return sets;
}
