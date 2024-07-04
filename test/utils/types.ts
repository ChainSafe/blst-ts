import * as bindings from "../../index.js";

export type BufferLike = string | Uint8Array | Buffer | bindings.PublicKey | bindings.Signature;

export interface TestSet {
  msg: Uint8Array;
  sk: bindings.SecretKey;
  pk: bindings.PublicKey;
  sig: bindings.Signature;
}

export type SerializedSet = Record<keyof TestSet, Uint8Array>;

export type SignatureSetArray = bindings.SignatureSet[];

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

export type CodeError = {
  code: string;
  message: string;
};
