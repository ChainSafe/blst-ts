import * as bindings from "../../lib";

export type BufferLike = string | Uint8Array | Buffer | bindings.Serializable;

export interface NapiTestSet {
  message: Uint8Array;
  secretKey: bindings.SecretKey;
  publicKey: bindings.PublicKey;
  signature: bindings.Signature;
}

export type SerializedSet = Record<keyof NapiTestSet, Uint8Array>;

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
