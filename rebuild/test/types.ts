import * as bindings from "../lib/index.js";

export type BufferLike = string | bindings.BlstBuffer;

export interface NapiTestSet {
  message: Uint8Array;
  secretKey: bindings.SecretKey;
  publicKey: bindings.PublicKey;
  signature: bindings.Signature;
}
