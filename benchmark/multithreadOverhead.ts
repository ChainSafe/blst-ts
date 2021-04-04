import os from "os";
import * as bls from "../src/lib";
import { BlsMultiThreadNaive } from "../test/multithread/naive";
import { warmUpWorkers } from "../test/multithread/naive/utils";
import { runBenchmark } from "./runner";

(async function () {
  const maxMs = 10000;
  const sigCount = 128;

  // Not actual physical CPU core count
  // To get the physical count see
  // (1) https://gist.github.com/jakoboo/82be8c031bc09cf2e75dac9253645f2a
  // (2) https://www.npmjs.com/package/physical-cpu-count
  const logicalCpuCount = os.cpus().length;

  console.log("Warming up workers...");
  const pool = new BlsMultiThreadNaive();
  await warmUpWorkers(pool);
  console.log("Pool ready");

  // Ping

  // Benchmarking postMessage with raw .js scripts it takes 1.7ms one way
  // Benchmarking with SharedArrayBuffers and Atomics it still takes 1.7ms

  {
    const results: { i: number; avg: number }[] = [];

    for (let workers = 1; workers <= logicalCpuCount; workers++) {
      const avg = await runBenchmark({
        id: `Ping num (${workers} workers)`,
        before: () => {},
        run: async () => {
          await Promise.all(
            Array.from({ length: workers }, (_, i) => i).map(() => pool.ping(3))
          );
        },
        maxMs,
        runs: 16000,
      });

      results.push({ i: workers, avg });
    }

    console.log(results.map(({ i, avg }) => [i, avg].join(", ")).join("\n"));
  }

  // Receive

  {
    const results: { i: number; avg: number }[] = [];

    for (let workers = 1; workers <= 1; workers++) {
      for (let i = 1; i <= sigCount; i = i * 2) {
        const msgs: Uint8Array[] = [];
        const pks: Uint8Array[] = [];
        const sigs: Uint8Array[] = [];
        for (let j = 0; j < i; j++) {
          const msg2 = Buffer.alloc(32, j);
          msgs.push(msg2);
          pks.push(msg2);
          sigs.push(msg2);
        }

        const avg = await runBenchmark({
          id: `Receive msg ${i}`,
          before: () => {},
          run: async () => {
            await Promise.all(
              Array.from({ length: workers }, (_, i) => i).map(() =>
                pool.receive(msgs, pks, sigs)
              )
            );
          },
          maxMs,
        });

        results.push({ i, avg });
      }
    }

    console.log(results.map(({ i, avg }) => [i, avg].join(", ")).join("\n"));
  }

  // Serdes + receive

  {
    console.log("Preparing test data...");
    const msg = Buffer.alloc(32, 1);
    const sk = bls.SecretKey.fromKeygen(Buffer.alloc(32, 1));
    const pk = sk.toPublicKey();
    const sig = sk.sign(msg);

    const results: { i: number; avg: number }[] = [];

    for (let workers = 1; workers <= 1; workers++) {
      for (let i = 1; i <= sigCount; i = i * 2) {
        const msgs: Uint8Array[] = [];
        const pks: bls.PublicKey[] = [];
        const sigs: bls.Signature[] = [];
        for (let j = 0; j < i; j++) {
          msgs.push(msg);
          pks.push(pk);
          sigs.push(sig);
        }

        const avg = await runBenchmark({
          id: `Send receive msg + serdes ${i}`,
          before: () => {},
          run: async () => {
            await Promise.all(
              Array.from({ length: workers }, (_, i) => i).map(() =>
                pool.serders(msgs, pks, sigs)
              )
            );
          },
          maxMs,
        });

        results.push({ i, avg });
      }
    }

    console.log(results.map(({ i, avg }) => [i, avg].join(", ")).join("\n"));
  }

  console.log("Destroying pool");
  await pool.destroy();
})();
