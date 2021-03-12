const { Worker } = require("worker_threads");

async function run() {
  await new Promise((resolve, reject) => {
    const worker = new Worker("./runnable.js");
    worker.on("error", reject);
    worker.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(Error(`exit code ${code}`));
    });
  });
}

for (let i = 0; i < 8; i++) {
  run().then(
    () => console.log(i, "done"),
    (e) => console.error(i, e)
  );
}
