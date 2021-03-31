import crypto from "crypto";
import {
  blst,
  BLST_ERROR,
  P1_Affine,
  P2_Affine,
  Pairing,
} from "../src/bindings";
import {
  AggregatePublicKey,
  AggregateSignature,
  fastAggregateVerify,
  PublicKey,
  SecretKey,
  Signature,
  verify,
} from "../src/lib";
import { runBenchmark } from "./runner";

const dst = "BLS_SIG_BLS12381G2-SHA256-SSWU-RO_POP_";
const hashOrEncode = true;
const msg = Buffer.from("Mr F was here");

(async function () {
  await runBenchmark({
    id: "Scalar multiplication G1 (255-bit, constant-time)",
    before: () => {},
    beforeEach: () => ({
      scal: crypto.randomBytes(32),
      p: new blst.P1(blst.BLS12_381_G1), // init from generator
    }),
    run: ({ scal, p }) => {
      p.mult(scal);
    },
  });

  await runBenchmark({
    id: "Scalar multiplication G2 (255-bit, constant-time)",
    before: () => {},
    beforeEach: () => ({
      scal: crypto.randomBytes(32),
      p: new blst.P2(blst.BLS12_381_G2), // init from generator
    }),
    run: ({ scal, p }) => {
      p.mult(scal);
    },
  });

  await runBenchmark({
    id: "EC add G1 (constant-time)",
    before: () => {},
    beforeEach: () => {
      const a = new blst.P1(blst.BLS12_381_G1); // init from G2 generator
      return { a, b: a };
    },
    run: ({ a, b }) => {
      a.add(b);
    },
  });

  await runBenchmark({
    id: "EC add G2 (constant-time)",
    before: () => {},
    beforeEach: () => {
      const a = new blst.P2(blst.BLS12_381_G2); // init from G2 generator
      return { a, b: a };
    },
    run: ({ a, b }) => {
      a.add(b);
    },
  });

  await runBenchmark<{ pk: P1_Affine; sig: P2_Affine }, Pairing>({
    id: "Pairing (Miller loop + Final Exponentiation)",
    before: () => {
      const sk = new blst.SecretKey();
      sk.keygen("*".repeat(32));
      const p1 = new blst.P1(sk);
      const pk = p1.to_affine();

      // Signing
      const p2 = new blst.P2();
      const sig = p2.hash_to(msg, dst).sign_with(sk).to_affine();

      return { pk, sig };
    },
    beforeEach: ({ pk, sig }) => {
      // Verification
      const pairing = new blst.Pairing(hashOrEncode, dst); // blst_pairing_init
      const aggRes = pairing.aggregate(pk, sig, msg);
      if (aggRes !== BLST_ERROR.BLST_SUCCESS) {
        throw Error(`error on pairing.aggregate: ${aggRes}`);
      }

      return pairing;
    },
    run: (pairing) => {
      pairing.commit(); // Miller loop
      const valid = pairing.finalverify(); // Final Exponentiation
    },
  });

  await runBenchmark({
    id: "Hash to G2 (Draft #9) + affine conversion",
    before: () => {},
    beforeEach: () => new blst.P2(),
    run: (p2) => {
      const p2Hashed = p2.hash_to(msg, dst);
      const p2Aff = new blst.P2_Affine(p2Hashed);
    },
  });

  // Serialization + de-serialization

  for (const { id, P, p } of [
    { id: "P1", P: blst.P1, p: blst.BLS12_381_G1 },
    { id: "P2", P: blst.P2, p: blst.BLS12_381_G2 },
  ]) {
    await runBenchmark({
      id: `${id} to_affine`,
      before: () => {},
      beforeEach: () => new P(p),
      run: (p) => p.to_affine(),
    });

    await runBenchmark({
      id: `${id} to_jacobian`,
      before: () => {},
      beforeEach: () => p.dup(),
      run: (p) => p.to_jacobian(),
    });

    await runBenchmark({
      id: `${id} compress`,
      before: () => {},
      beforeEach: () => new P(p),
      run: (p) => p.compress(),
    });

    await runBenchmark({
      id: `${id} serialize`,
      before: () => {},
      beforeEach: () => new P(p),
      run: (p) => p.serialize(),
    });

    await runBenchmark({
      id: `${id} from compress`,
      before: () => {},
      beforeEach: () => new P(p).compress(),
      run: (bytes) => new P(bytes),
    });

    await runBenchmark({
      id: `${id} from serialize`,
      before: () => {},
      beforeEach: () => new P(p).serialize(),
      run: (bytes) => new P(bytes),
    });
  }

  // BLS lib

  await runBenchmark({
    id: "BLS signature",
    before: () => {},
    beforeEach: () => SecretKey.fromKeygen(crypto.randomBytes(32)),
    run: (sk) => {
      sk.sign(msg);
    },
  });

  await runBenchmark<{ pk: PublicKey; sig: Signature }>({
    id: "BLS verification",
    before: () => {
      const sk = SecretKey.fromKeygen(crypto.randomBytes(32));
      const pk = sk.toPublicKey();
      const sig = sk.sign(msg);
      return { pk, sig };
    },
    beforeEach: (arg) => arg,
    run: ({ pk, sig }) => {
      verify(msg, pk, sig);
    },
  });

  for (const n of [32, 128, 512]) {
    await runBenchmark<{ pks: AggregatePublicKey[]; sig: Signature }>({
      id: `BLS agg verif of 1 msg by ${n} pubkeys`,
      before: () => {
        const pks: AggregatePublicKey[] = [];
        const sigs: Signature[] = [];

        for (let i = 0; i < n; i++) {
          const sk = SecretKey.fromKeygen(Buffer.alloc(32, i));
          pks.push(sk.toAggregatePublicKey());
          sigs.push(sk.sign(msg));
        }

        const sig = AggregateSignature.fromSignatures(sigs).toSignature();
        return { pks, sig };
      },
      beforeEach: (arg) => arg,
      run: ({ pks, sig }) => {
        fastAggregateVerify(msg, pks, sig);
      },
    });
  }

  // BLS verif of 6 msgs by 6 pubkeys
  // Serial batch verify 6 msgs by 6 pubkeys (with blinding)
  // Parallel batch verify of 6 msgs by 6 pubkeys (with blinding)
})();
