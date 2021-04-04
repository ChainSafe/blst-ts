import crypto from "crypto";
import * as bls from "../src/lib";
import { runBenchmark } from "./runner";

(async function () {
  const results: { i: number; serie: number; batch: number }[] = [];

  for (let i = 1; i <= 128; i = i * 2) {
    const serie = await runBenchmark({
      id: `${i} - BLS verification`,
      before: () => {
        const msg = Buffer.alloc(32, i);
        const sk = bls.SecretKey.fromKeygen(crypto.randomBytes(32));
        const pk = sk.toPublicKey();
        const sig = sk.sign(msg);
        return { msg, pk, sig };
      },
      run: ({ msg, pk, sig }) => {
        for (let j = 0; j < i; j++) {
          bls.verify(msg, pk, sig);
        }
      },
    });

    const batch = await runBenchmark({
      id: `${i} - BLS verification batch`,
      before: () => {
        const msg = Buffer.alloc(32, i);
        const sk = bls.SecretKey.fromKeygen(crypto.randomBytes(32));
        const pk = sk.toPublicKey();
        const sig = sk.sign(msg);
        return Array.from({ length: i }, (_, i) => ({ msg, pk, sig }));
      },
      run: (sets) => {
        bls.verifyMultipleAggregateSignatures(sets);
      },
    });

    results.push({ i, serie, batch });
  }

  console.log(
    results
      .map(({ i, serie, batch }) =>
        [i, serie / i, batch / i, batch / i / (serie / i)].join(", ")
      )
      .join("\n")
  );
})();
