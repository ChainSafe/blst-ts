/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
// eslint-disable-next-line @typescript-eslint/no-unsafe-call
require("ts-node").register();
const worker = require("worker_threads");
const {expose} = require("@chainsafe/threads/worker");
const {runSwigWorkRequests} = require("./runWorkRequests");

const workerData = worker.workerData;
if (!workerData) throw Error("workerData must be defined");
const {workerId} = workerData || {};

expose({
  async runWorkRequests(workReqArr) {
    return runSwigWorkRequests(workerId, workReqArr);
  },
});
