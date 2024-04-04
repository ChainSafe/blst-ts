import * as bindings from "../lib";

export type BufferLike = string | bindings.BlstBuffer;

export interface NapiTestSet {
  message: Uint8Array;
  secretKey: bindings.SecretKey;
  publicKey: bindings.PublicKey;
  signature: bindings.Signature;
}
