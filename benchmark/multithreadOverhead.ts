import os from "os";
import * as bls from "../src/lib";
import { BlsMultiThreadNaive } from "../test/multithread/naive";
import { warmUpWorkers } from "../test/multithread/naive/utils";
import { Csv } from "./utils/csv";
import { BenchmarkRunner } from "./utils/runner";

(async function () {
  const runner = new BenchmarkRunner("BLS multi-threaded overhead benchmark");

  const sigCount = 128;

  // Not actual physical CPU core count
  // To get the physical count see
  // (1) https://gist.github.com/jakoboo/82be8c031bc09cf2e75dac9253645f2a
  // (2) https://www.npmjs.com/package/physical-cpu-count
  const logicalCpuCount = os.cpus().length;

  // Warming up workers...
  const pool = new BlsMultiThreadNaive();
  await warmUpWorkers(pool);

  // postMessage latency

  // Benchmarking postMessage with raw .js scripts it takes 1.7ms one way
  // Benchmarking with SharedArrayBuffers and Atomics it still takes 1.7ms

  {
    const csv = new Csv<"workers" | "avg">();

    for (let workers = 1; workers <= logicalCpuCount; workers *= 2) {
      const avg = await runner.run({
        id: `Send and receive a message from echo worker (${workers} workers)`,
        before: () => {},
        run: async () => {
          await Promise.all(
            Array.from({ length: workers }, (_, i) => i).map(() => pool.ping(3))
          );
        },
      });
      csv.addRow({ workers, avg });
    }
    csv.logToConsole();
  }

  // Serialization + deserialization cost

  {
    const csv = new Csv<"n" | "avg">();
    const maxCount = 1024;

    const msg = Buffer.alloc(32, 1);
    const sk = bls.SecretKey.fromKeygen(Buffer.alloc(32, 1));
    const pk = sk.toPublicKey();
    const sig = sk.sign(msg);

    const msgs: Uint8Array[] = new Array(maxCount).fill(msg);
    const pks: bls.PublicKey[] = new Array(maxCount).fill(pk);
    const sigs: bls.Signature[] = new Array(maxCount).fill(sig);

    for (let n = 1; n <= 1024; n *= 4) {
      const avg = await runner.run({
        id: `Serialize + send + deserialize ${n} sig sets to worker`,
        before: () => {},
        run: async () => {
          await pool.serders(
            msgs.slice(0, n),
            pks.slice(0, n),
            sigs.slice(0, n)
          );
        },
      });

      csv.addRow({ n, avg });
    }
    csv.logToConsole();
  }

  console.log("Destroying pool");
  await pool.destroy();
})();
