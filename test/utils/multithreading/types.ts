import {Worker} from "@chainsafe/threads";
import {SignatureSet as SwigSignatureSet, PublicKey as SwigPublicKey} from "../../../src";
import {SignatureSet as NapiSignatureSet, PublicKey as NapiPublicKey} from "../../../rebuild/lib";

export type PublicKey = SwigPublicKey | NapiPublicKey;

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

export type ISignatureSet = SingleSignatureSet | AggregatedSignatureSet;

export type SignatureSetArray = SwigSignatureSet[] | NapiSignatureSet[];

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
