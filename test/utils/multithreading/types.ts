import {PublicKey, Signature} from "../../../index.js";
import {SignatureSetArray} from "../types";

export enum SignatureSetType {
  single = "single",
  aggregate = "aggregate",
}

export type SingleSignatureSet = {
  type: SignatureSetType.single;
  pubkey: PublicKey;
  signingRoot: Uint8Array;
  signature: Uint8Array;
};

export type AggregatedSignatureSet = {
  type: SignatureSetType.aggregate;
  pubkeys: PublicKey[];
  signingRoot: Uint8Array;
  signature: Uint8Array;
};

export type SignatureSetGroups = (SingleSignatureSet[] | AggregatedSignatureSet[])[];

export type ISignatureSet = SingleSignatureSet | AggregatedSignatureSet;

export interface SameMessagePair {
  publicKey: PublicKey;
  signature: Signature;
}
export interface SameMessageSet {
  sets: SameMessagePair[];
  message: Uint8Array;
}

export type SameMessageSetArray = SameMessageSet[];

export type BlsMultiThreadWorkerPoolOptions = {
  blsVerifyAllInQueue?: boolean;
  addVerificationRandomness?: boolean;
};

export type BlsMultiThreadWorkerPoolModules = Record<string, never>;

export interface VerifySignatureOpts {
  batchable?: boolean;
  verifyOnMainThread?: boolean;
  priority?: boolean;
  addVerificationRandomness?: boolean;
}

export interface BlsWorkRequest {
  opts: VerifySignatureOpts;
  sets: SignatureSetArray;
}

export enum WorkResultCode {
  success = "success",
  error = "error",
}

export type WorkResultError = {code: WorkResultCode.error; error: Error};
export type WorkResult<R> = {code: WorkResultCode.success; result: R} | WorkResultError;

export interface BlsWorkResult {
  /** Total num of batches that had to be retried */
  batchRetries: number;
  /** Total num of sigs that have been successfully verified with batching */
  batchSigsSuccess: number;
  results: WorkResult<boolean>[];
}
