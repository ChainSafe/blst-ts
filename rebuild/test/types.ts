import * as bindings from "../lib";

export type BufferLike = string | bindings.BlstBuffer | bindings.Serializable;

export interface NapiTestSet {
  msg: Uint8Array;
  secretKey: bindings.SecretKey;
  publicKey: bindings.PublicKey;
  signature: bindings.Signature;
}
