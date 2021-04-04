import os from "os";
import * as bls from "../src/lib";
import { BlsMultiThreadNaive } from "../test/unit/multithread/naive";
import { warmUpWorkers } from "../test/unit/multithread/naive/utils";
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

  console.log("Preparing test data...");
  const msgs: Uint8Array[] = [];
  const sks: bls.SecretKey[] = [];
  const pks: bls.PublicKey[] = [];
  const sigs: bls.Signature[] = [];
  for (let i = 0; i < sigCount; i++) {
    const msg = Buffer.alloc(32, i);
    const sk = bls.SecretKey.fromKeygen(Buffer.alloc(32, i));
    msgs.push(msg);
    sks.push(sk);
    pks.push(sk.toPublicKey());
    sigs.push(sk.sign(msg));
  }

  // BLS batch verify

  {
    const results: { i: number; serie: number; parallel: number }[] = [];

    for (let workers = 1; workers <= logicalCpuCount; workers++) {
      const serie = await runBenchmark({
        id: "BLS batch verify",
        before: () => {},
        run: () => {
          for (let j = 0; j < workers; j++) {
            bls.verifyMultipleAggregateSignatures(msgs, pks, sigs);
          }
        },
        maxMs,
      });

      const parallel = await runBenchmark({
        id: "BLS batch verify multithread naive",
        before: () => {},
        run: async () => {
          await Promise.all(
            Array.from({ length: workers }, (_, i) => i).map(() =>
              pool.verifyMultipleAggregateSignatures(msgs, pks, sigs)
            )
          );
        },
        maxMs,
      });

      results.push({
        i: workers,
        serie: serie / workers,
        parallel: parallel / workers,
      });
    }

    console.log(
      results
        .map(({ i, serie, parallel }) =>
          [i, serie, parallel, parallel / serie].join(", ")
        )
        .join("\n")
    );
  }

  // BLS verify

  {
    const results: { i: number; serie: number; parallel: number }[] = [];

    for (let workers = 1; workers <= 8; workers++) {
      const msg = Buffer.alloc(32, 1);
      const sk = bls.SecretKey.fromKeygen(Buffer.alloc(32, 1));
      const pk = sk.toPublicKey();
      const sig = sk.sign(msg);

      const serie = await runBenchmark({
        id: "BLS verify",
        before: () => {},
        run: () => {
          for (let i = 0; i < workers; i++) {
            bls.verify(msg, pk, sig);
          }
        },
        maxMs,
      });

      const parallel = await runBenchmark({
        id: "BLS verify multithread naive",
        before: () => {},
        run: async () => {
          await Promise.all(
            Array.from({ length: workers }, (_, i) => i).map(() =>
              pool.verify(msg, pk, sig)
            )
          );
        },
        maxMs,
      });

      results.push({
        i: workers,
        serie: serie / workers,
        parallel: parallel / workers,
      });
    }

    console.log(
      results
        .map(({ i, serie, parallel }) =>
          [i, serie, parallel, parallel / serie].join(", ")
        )
        .join("\n")
    );
  }

  console.log("Destroying pool");
  await pool.destroy();
})();
