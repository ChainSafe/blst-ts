import path from "path";

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

    // Create multiple workers so blst.node is imported twice to trigger the error
    // blst/bindings/node.js$ node worker-threads.js
    // Error: Module did not self-register: 'blst/bindings/node.js/blst.node'.

    async function run(i: number) {
      await new Promise<void>((resolve, reject) => {
        const worker = new Worker(path.join(__dirname, "threads/runnable.js"));

        worker.on("error", reject);
        worker.on("exit", (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(Error(`exit code ${code}`));
          }
        });
      });
    }

    await Promise.all(Array.from({ length: 8 }, (_, i) => run(i)));
  });
});
