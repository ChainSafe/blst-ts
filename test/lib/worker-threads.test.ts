import { Worker } from "worker_threads";

describe("worker_threads test", () => {
  it("Should not throw when importing in two threads", () => {
    // Create two workers so blst.node is imported twice to trigger the error
    // blst/bindings/node.js$ node worker-threads.js
    // Error: Module did not self-register: 'blst/bindings/node.js/blst.node'.

    const worker1 = new Worker("./runnable.js");
    const worker2 = new Worker("./runnable.js");
  });
});
