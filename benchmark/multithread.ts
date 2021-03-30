import crypto from "crypto";
import * as bls from "../src/lib";
import { BlsMultiThreadNaive } from "../src/multithread/naive";
import { runBenchmark } from "./runner";

const dst = "BLS_SIG_BLS12381G2-SHA256-SSWU-RO_POP_";
const hashOrEncode = true;
const msg = Buffer.from("Mr F was here");

(async function () {
  const runs = 32;
  const n = 128;

  console.log("Starting pool");
  const pool = new BlsMultiThreadNaive();
  await pool.startAll();
  console.log("Started pool");

  // BLS verify

  await runBenchmark({
    id: "BLS verify",
    before: () => {
      const sk = bls.SecretKey.fromKeygen(crypto.randomBytes(32));
      return { pk: sk.toPublicKey(), sig: sk.sign(msg) };
    },
    beforeEach: (arg) => arg,
    run: ({ pk, sig }) => {
      for (let i = 0; i < n; i++) {
        bls.verify(msg, pk, sig);
      }
    },
    runs,
  });

  await runBenchmark({
    id: "BLS verify multithread naive",
    before: () => {
      const sk = bls.SecretKey.fromKeygen(crypto.randomBytes(32));
      return { pk: sk.toPublicKey(), sig: sk.sign(msg) };
    },
    beforeEach: (arg) => arg,
    run: async ({ pk, sig }) => {
      await Promise.all(
        Array.from({ length: n }, (_, i) => i).map((i) =>
          pool.verify(msg, pk, sig)
        )
      );
    },
    runs,
  });

  // BLS batch verify

  await runBenchmark({
    id: "BLS batch verify",
    before: () => {
      const sk = bls.SecretKey.fromKeygen(crypto.randomBytes(32));
      const pk = sk.toPublicKey();
      const sig = sk.sign(msg);
      return {
        msgs: Array.from({ length: n }, (_, i) => msg),
        pks: Array.from({ length: n }, (_, i) => pk),
        sigs: Array.from({ length: n }, (_, i) => sig),
      };
    },
    beforeEach: (arg) => arg,
    run: ({ msgs, pks, sigs }) => {
      bls.verifyMultipleAggregateSignatures(msgs, pks, sigs);
    },
    runs,
  });

  await runBenchmark({
    id: "BLS batch verify multithread naive",
    before: () => {
      const sk = bls.SecretKey.fromKeygen(crypto.randomBytes(32));
      const pk = sk.toPublicKey();
      const sig = sk.sign(msg);
      return {
        msgs: Array.from({ length: n }, (_, i) => msg),
        pks: Array.from({ length: n }, (_, i) => pk),
        sigs: Array.from({ length: n }, (_, i) => sig),
      };
    },
    beforeEach: (arg) => arg,
    run: async ({ msgs, pks, sigs }) => {
      const perWorker = 16;
      await Promise.all(
        Array.from({ length: n / perWorker }, (_, i) => i).map((i) => {
          const from = i * perWorker;
          const to = (i + 1) * perWorker;
          return pool.verifyMultipleAggregateSignatures(
            msgs.slice(from, to),
            pks.slice(from, to),
            sigs.slice(from, to)
          );
        })
      );
    },
    runs,
  });

  console.log("Destroying pool");
  await pool.destroy();
})();
