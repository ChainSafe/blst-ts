import path from "path";

describe("worker_threads test", function () {
  const nodeJsSemver = process.versions.node;
  const nodeJsMajorVer = parseInt(nodeJsSemver.split(".")[0]);

  before(function () {
    if (!nodeJsMajorVer) {
      throw Error(`Error parsing NodeJS version: ${nodeJsSemver}`);
    }

    // eslint-disable-next-line no-console
    console.log({
      nodeJsMajorVer,
      arch: process.arch,
      platform: process.platform,
    });

    if (
      // NodeJS v12 has still weak support for workers
      nodeJsMajorVer < 12 ||
      // TODO: Unit-tests don't pass for arm64
      process.arch === "arm64"
    ) {
      this.skip(); // Skip everything
    }
  });

  it("Should not throw when importing in two threads", async function () {
    const {Worker} = await import("worker_threads");

    // Create multiple workers so blst.node is imported twice to trigger the error
    // blst/bindings/node.js$ node worker-threads.js
    // Error: Module did not self-register: 'blst/bindings/node.js/blst.node'.

    async function run(): Promise<void> {
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

    await Promise.all(Array.from({length: 8}, () => run()));
  });
});
