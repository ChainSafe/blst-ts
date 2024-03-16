import * as swig from "../../src";
import * as napi from "../../rebuild/lib";

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

export type Bufferish = string | Uint8Array | Buffer | napi.Serializable;

export interface SwigSet {
  msg: Uint8Array;
  sk: swig.SecretKey;
  pk: swig.PublicKey;
  sig: swig.Signature;
}

export interface NapiSet {
  message: Uint8Array;
  secretKey: napi.SecretKey;
  publicKey: napi.PublicKey;
  signature: napi.Signature;
}

export type SerializedSet = Record<keyof NapiSet, Uint8Array>;

export type PublicKey = swig.PublicKey | napi.PublicKey;

export type SignatureSetArray = swig.SignatureSet[] | napi.SignatureSet[];
