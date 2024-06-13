import crypto from "crypto";
import * as bls from "../src/lib";
import * as next from "../next/index.js";
import {Csv} from "./utils/csv";
import {BenchmarkRunner} from "./utils/runner";

(async function () {
  const runner = new BenchmarkRunner("Batch verify benchmark");
  const csv = new Csv<"n" | "serie" | "batch" | "ratio">();

  for (let i = 1; i <= 128; i = i * 2) {
    const serie = await runner.run({
      id: `${i} - BLS verification`,
      before: () => {
        const msg = Buffer.alloc(32, i);
        const sk = bls.SecretKey.fromKeygen(crypto.randomBytes(32));
        const pk = sk.toPublicKey();
        const sig = sk.sign(msg);
        return {msg, pk, sig};
      },
      run: ({msg, pk, sig}) => {
        for (let j = 0; j < i; j++) {
          bls.verify(msg, pk, sig);
        }
      },
    });

    const batch = await runner.run({
      id: `${i} - BLS verification batch`,
      before: () => {
        const msg = Buffer.alloc(32, i);
        const sk = bls.SecretKey.fromKeygen(crypto.randomBytes(32));
        const pk = sk.toPublicKey();
        const sig = sk.sign(msg);
        return Array.from({length: i}, (_, i) => ({msg, pk, sig}));
      },
      run: (sets) => {
        bls.verifyMultipleAggregateSignatures(sets);
      },
    });

    csv.addRow({
      n: i,
      serie: serie / i,
      batch: batch / i,
      ratio: batch / serie,
    });
  }

  csv.logToConsole();
})();

(async function () {
  const runner = new BenchmarkRunner("Batch verify benchmark");
  const csv = new Csv<"n" | "serie" | "batch" | "ratio">();

  for (let i = 1; i <= 128; i = i * 2) {
    const serie = await runner.run({
      id: `${i} - BLS verification - next`,
      before: () => {
        const msg = Buffer.alloc(32, i);
        const sk = next.SecretKey.fromKeygen(crypto.randomBytes(32));
        const pk = sk.toPublicKey();
        const sig = sk.sign(msg);
        return {msg, pk, sig};
      },
      run: ({msg, pk, sig}) => {
        for (let j = 0; j < i; j++) {
          next.verify(msg, pk, sig);
        }
      },
    });

    const batch = await runner.run({
      id: `${i} - BLS verification batch - next`,
      before: () => {
        const msg = Buffer.alloc(32, i);
        const sk = next.SecretKey.fromKeygen(crypto.randomBytes(32));
        const pk = sk.toPublicKey();
        const sig = sk.sign(msg);
        return Array.from({length: i}, (_, i) => ({msg, pk, sig}));
      },
      run: (sets) => {
        const msgs: Uint8Array[] = []
        const pks: next.PublicKey[] = []
        const sigs: next.Signature[] = []
        for (const set of sets) {
          msgs.push(set.msg)
          pks.push(set.pk)
          sigs.push(set.sig)
        }
        next.verifyMultipleAggregateSignatures(msgs, pks, sigs);
      },
    });

    csv.addRow({
      n: i,
      serie: serie / i,
      batch: batch / i,
      ratio: batch / serie,
    });
  }

  csv.logToConsole();
})();
