import os from "os";
import * as bls from "../src/lib";
import {BlsMultiThreadNaive} from "../test/multithread/naive";
import {warmUpWorkers, chunkify} from "../test/multithread/naive/utils";
import {Csv} from "./utils/csv";
import {BenchmarkRunner} from "./utils/runner";

(async function () {
  const runner = new BenchmarkRunner("BLS multi-threaded benchmark", {
    maxMs: 10000,
  });

  const sigCount = 128;

  // Not actual physical CPU core count
  // To get the physical count see
  // (1) https://gist.github.com/jakoboo/82be8c031bc09cf2e75dac9253645f2a
  // (2) https://www.npmjs.com/package/physical-cpu-count
  const logicalCpuCount = os.cpus().length;

  // Warming up workers...
  const pool = new BlsMultiThreadNaive();
  await warmUpWorkers(pool);

  // Preparing test data
  const sets: bls.SignatureSet[] = [];
  for (let i = 0; i < sigCount; i++) {
    const msg = Buffer.alloc(32, i);
    const sk = bls.SecretKey.fromKeygen(Buffer.alloc(32, i));
    sets.push({msg, pk: sk.toPublicKey(), sig: sk.sign(msg)});
  }

  // BLS batch verify
  // Total time to verify sigCount signatures should reduce with,
  // up to the max num of physical CPU cores
  // ```
  // total_time = time_single_cpu / workers
  // ```
  // Check the CSV values below to plot this relation
  // Note: Some CPUs may use hypthreading so the `threads` library may
  // spawn more workers than CPU core available, deviating the results

  {
    const csv = new Csv<"workers" | "serie" | "parallel" | "ratio">();

    const serie = await runner.run({
      id: `BLS batch verify ${sigCount} sigs - main thread`,
      before: () => {},
      run: () => {
        bls.verifyMultipleAggregateSignatures(sets);
      },
    });

    for (let workers = 1; workers <= logicalCpuCount; workers++) {
      const parallel = await runner.run({
        id: `BLS batch verify ${sigCount} sigs - ${workers} worker_threads`,
        before: () => {},
        run: async () => {
          await Promise.all(
            chunkify(sets, workers).map((setsWorker) => pool.verifyMultipleAggregateSignatures(setsWorker))
          );
        },
      });

      csv.addRow({
        workers,
        serie: serie,
        parallel: parallel,
        ratio: serie / parallel,
      });
    }
    csv.logToConsole();
  }

  // BLS verify
  // Throw many single signature sets to the thread pool queue
  // In this test the overhead may dominate the results

  {
    await runner.run({
      id: `BLS verify ${sigCount} sigs - main thread`,
      before: () => {},
      run: () => {
        for (const {msg, pk, sig} of sets) {
          bls.verify(msg, pk, sig);
        }
      },
    });

    await runner.run({
      id: `BLS verify ${sigCount} sigs - worker_threads (all)`,
      before: () => {},
      run: async () => {
        await Promise.all(sets.map(({msg, pk, sig}) => pool.verify(msg, pk, sig)));
      },
    });
  }

  await pool.destroy();
})();
