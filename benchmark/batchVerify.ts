import crypto from "crypto";
import * as bls from "../src/lib";
import { runBenchmark } from "./runner";

const dst = "BLS_SIG_BLS12381G2-SHA256-SSWU-RO_POP_";
const hashOrEncode = true;
const msg = Buffer.from("Mr F was here");

(async function () {
  const results: { i: number; serie: number; batch: number }[] = [];

  for (let i = 1; i <= 128; i = i * 2) {
    const serie = await runBenchmark({
      id: `${i} - BLS verification`,
      before: () => {
        const sk = bls.SecretKey.fromKeygen(crypto.randomBytes(32));
        const pk = sk.toPublicKey();
        const sig = sk.sign(msg);
        return { pk, sig };
      },
      beforeEach: (arg) => arg,
      run: ({ pk, sig }) => {
        for (let j = 0; j < i; j++) {
          bls.verify(msg, pk, sig);
        }
      },
    });

    const batch = await runBenchmark({
      id: `${i} - BLS verification batch`,
      before: () => {
        const sk = bls.SecretKey.fromKeygen(crypto.randomBytes(32));
        const pk = sk.toPublicKey();
        const sig = sk.sign(msg);
        return {
          msgs: Array.from({ length: i }, (_, i) => msg),
          pks: Array.from({ length: i }, (_, i) => pk),
          sigs: Array.from({ length: i }, (_, i) => sig),
        };
      },
      beforeEach: (arg) => arg,
      run: ({ msgs, pks, sigs }) => {
        bls.verifyMultipleAggregateSignatures(msgs, pks, sigs);
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
