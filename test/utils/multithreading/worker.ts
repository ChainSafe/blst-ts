/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import worker from "worker_threads";
import {expose} from "@chainsafe/threads/worker";
import {WorkerData, BlsWorkRequest, BlsWorkResult} from "./types";
import {runSwigWorkRequests} from "./runWorkRequests";

const workerData = worker.workerData as WorkerData;
if (!workerData) throw Error("workerData must be defined");
const {workerId} = workerData || {};

expose({
  async runWorkRequests(workReqArr: BlsWorkRequest[]): Promise<BlsWorkResult> {
    return runSwigWorkRequests(workerId, workReqArr);
  },
});
