import {expect} from "chai";
import {BufferLike, InstanceTestCases} from "./types";

function toHexString(bytes: BufferLike): string {
  if (typeof bytes === "string") return bytes;
  if (bytes instanceof Buffer) return bytes.toString("hex");
  if (bytes instanceof Uint8Array) return Buffer.from(bytes).toString("hex");
  if (typeof bytes.toBytes === "function") return Buffer.from(bytes.toBytes()).toString("hex");
  throw Error("toHexString only accepts BufferLike types");
}

export function toHex(bytes: BufferLike): string {
  const hex = toHexString(bytes);
  if (hex.startsWith("0x")) return hex;
  return "0x" + hex;
}

export function fromHex(hexString: string): Buffer {
  if (hexString.startsWith("0x")) hexString = hexString.slice(2);
  return Buffer.from(hexString, "hex");
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

export function getFilledUint8(length: number, fillWith: string | number | Buffer = "*"): Uint8Array {
  return Uint8Array.from(Buffer.alloc(length, fillWith));
}

export function sullyUint8Array(bytes: Uint8Array): Uint8Array {
  return Uint8Array.from(
    Buffer.from([...Uint8Array.prototype.slice.call(bytes, 8), ...Buffer.from("0123456789abcdef", "hex")])
  );
}

export function arrayOfIndexes(start: number, end: number): number[] {
  const arr: number[] = [];
  for (let i = start; i <= end; i++) arr.push(i);
  return arr;
}

export function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length,
    randomIndex;

  while (currentIndex != 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }

  return array;
}

export function chunkifyMaximizeChunkSize<T>(arr: T[], minPerChunk: number): T[][] {
  const chunkCount = Math.floor(arr.length / minPerChunk);
  if (chunkCount <= 1) {
    return [arr];
  }

  // Prefer less chunks of bigger size
  const perChunk = Math.ceil(arr.length / chunkCount);
  const arrArr: T[][] = [];

  for (let i = 0; i < arr.length; i += perChunk) {
    arrArr.push(arr.slice(i, i + perChunk));
  }

  return arrArr;
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
          expectEqualHex(res, testCase.res);
        } else {
          expect(res).to.deep.equal(testCase.res);
        }
      });
    }
  }
}
