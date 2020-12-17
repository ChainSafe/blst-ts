describe("worker_threads test", function () {
  const nodeJsSemver = process.versions.node;
  const nodeJsMajorVer = parseInt(nodeJsSemver.split(".")[0]);

  it("Should not throw when importing in two threads", async function () {
    if (!nodeJsMajorVer) {
      throw Error(`Error parsing NodeJS version: ${nodeJsSemver}`);
    }
    if (nodeJsMajorVer < 12) {
      this.skip();
    }

    const { Worker } = await import("worker_threads");

    // Create two workers so blst.node is imported twice to trigger the error
    // blst/bindings/node.js$ node worker-threads.js
    // Error: Module did not self-register: 'blst/bindings/node.js/blst.node'.

    const worker1 = new Worker("./runnable.js");
    const worker2 = new Worker("./runnable.js");
  });
});
