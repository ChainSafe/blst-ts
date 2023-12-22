import {Worker} from "@chainsafe/threads";
import * as swig from "../../../src";
import * as napi from "../../../rebuild/lib";

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

export enum BlsPoolType {
  workers = "workers",
  libuv = "libuv",
}

export type BlsMultiThreadWorkerPoolOptions = {
  blsVerifyAllInQueue?: boolean;
  blsPoolType?: BlsPoolType;
};

export type BlsMultiThreadWorkerPoolModules = Record<string, never>;

export interface VerifySignatureOpts {
  batchable?: boolean;
  verifyOnMainThread?: boolean;
  priority?: boolean;
}

export enum SignatureSetType {
  single = "single",
  aggregate = "aggregate",
}
export type SwigSingleSignatureSet = {
  type: SignatureSetType.single;
  pubkey: swig.PublicKey;
  signingRoot: Uint8Array;
  signature: Uint8Array;
};
export type NapiSingleSignatureSet = {
  type: SignatureSetType.single;
  pubkey: napi.PublicKey;
  signingRoot: Uint8Array;
  signature: Uint8Array;
};
export type SingleSignatureSet = {
  type: SignatureSetType.single;
  pubkey: swig.PublicKey | napi.PublicKey;
  signingRoot: Uint8Array;
  signature: Uint8Array;
};

export type SwigAggregatedSignatureSet = {
  type: SignatureSetType.aggregate;
  pubkeys: swig.PublicKey[];
  signingRoot: Uint8Array;
  signature: Uint8Array;
};
export type NapiAggregatedSignatureSet = {
  type: SignatureSetType.aggregate;
  pubkeys: napi.PublicKey[];
  signingRoot: Uint8Array;
  signature: Uint8Array;
};
export type AggregatedSignatureSet = NapiAggregatedSignatureSet | SwigAggregatedSignatureSet;

export type ISignatureSet = SingleSignatureSet | AggregatedSignatureSet;

export type SignatureSetArray = swig.SignatureSet[] | napi.SignatureSet[];

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
  /** Ascending integer identifying the worker for metrics */
  workerId?: number;
  /** Total num of batches that had to be retried */
  batchRetries: number;
  /** Total num of sigs that have been successfully verified with batching */
  batchSigsSuccess: number;
  results: WorkResult<boolean>[];
}

export type WorkerApi = {
  runWorkRequests(workReqArr: BlsWorkRequest[]): Promise<BlsWorkResult>;
};

export enum WorkerStatusCode {
  notInitialized,
  initializing,
  initializationError,
  idle,
  running,
}

export type WorkerStatus =
  | {code: WorkerStatusCode.notInitialized}
  | {code: WorkerStatusCode.initializing; initPromise: Promise<WorkerApi>}
  | {code: WorkerStatusCode.initializationError; error: Error}
  | {code: WorkerStatusCode.idle; workerApi: WorkerApi}
  | {code: WorkerStatusCode.running; workerApi: WorkerApi};

export type WorkerDescriptor = {
  worker: Worker;
  status: WorkerStatus;
};

export type WorkRequestHandler = (workReqs: BlsWorkRequest[]) => Promise<BlsWorkResult>;

export interface WorkerData {
  workerId: number;
}
