const path = require("path");
const { Worker } = require("worker_threads");
const worker = new Worker(
  `
const { parentPort } = require("worker_threads");
parentPort.on("message", (time) => {
  parentPort.postMessage([time, process.hrtime()]);
});`,
  { eval: true }
);

const getDiff = (a, b) => (b[0] - a[0]) * 1e9 + b[1] - a[1];
let count = 0;
let mainToWorker = 0;
let workerToMain = 0;
worker.on("message", ([tmainStart, tworker]) => {
  const tmainEnd = process.hrtime();
  mainToWorker += getDiff(tmainStart, tworker);
  workerToMain += getDiff(tworker, tmainEnd);
  count++;
});

(async function () {
  for (let t = 0; t < 20; t++) {
    for (let i = 0; i < 500; i++) {
      worker.postMessage(process.hrtime());
      await new Promise((r) => setTimeout(r, t));
    }
    console.log(t, `main -> worker ${mainToWorker / count / 1e6} ms`);
    console.log(t, `worker -> main ${workerToMain / count / 1e6} ms`);
  }
  worker.terminate();
})();
