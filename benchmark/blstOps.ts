import crypto from "crypto";
import {blst, BLST_ERROR, P1_Affine, P2_Affine, Pairing} from "../src/bindings";
import {aggregateSignatures, fastAggregateVerify, PublicKey, SecretKey, Signature, verify} from "../src/lib";
import {BenchmarkRunner} from "./utils/runner";

const dst = "BLS_SIG_BLS12381G2-SHA256-SSWU-RO_POP_";
const hashOrEncode = true;
const msg = Buffer.from("Mr F was here");

(async function () {
  const runner = new BenchmarkRunner("BLS opts benchmark");

  await runner.run({
    id: "Scalar multiplication G1 (255-bit, constant-time)",
    before: () => {},
    beforeEach: () => ({
      scal: crypto.randomBytes(32),
      p: new blst.P1(blst.BLS12_381_G1), // init from generator
    }),
    run: ({scal, p}) => {
      p.mult(scal);
    },
  });

  await runner.run({
    id: "Scalar multiplication G2 (255-bit, constant-time)",
    before: () => {},
    beforeEach: () => ({
      scal: crypto.randomBytes(32),
      p: new blst.P2(blst.BLS12_381_G2), // init from generator
    }),
    run: ({scal, p}) => {
      p.mult(scal);
    },
  });

  await runner.run({
    id: "EC add G1 (constant-time)",
    before: () => {},
    beforeEach: () => {
      const a = new blst.P1(blst.BLS12_381_G1); // init from G2 generator
      return {a, b: a};
    },
    run: ({a, b}) => {
      a.add(b);
    },
  });

  await runner.run({
    id: "EC add G2 (constant-time)",
    before: () => {},
    beforeEach: () => {
      const a = new blst.P2(blst.BLS12_381_G2); // init from G2 generator
      return {a, b: a};
    },
    run: ({a, b}) => {
      a.add(b);
    },
  });

  await runner.run<{pk: P1_Affine; sig: P2_Affine}, Pairing>({
    id: "Pairing (Miller loop + Final Exponentiation)",
    before: () => {
      const sk = new blst.SecretKey();
      sk.keygen("*".repeat(32));
      const p1 = new blst.P1(sk);
      const pk = p1.to_affine();

      // Signing
      const p2 = new blst.P2();
      const sig = p2.hash_to(msg, dst).sign_with(sk).to_affine();

      return {pk, sig};
    },
    beforeEach: ({pk, sig}) => {
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

  await runner.run({
    id: "Hash to G2 (Draft #9) + affine conversion",
    before: () => {},
    beforeEach: () => new blst.P2(),
    run: (p2) => {
      const p2Hashed = p2.hash_to(msg, dst);
      const p2Aff = new blst.P2_Affine(p2Hashed);
    },
  });

  // Serialization + de-serialization

  for (const {id, P, p} of [
    {id: "P1", P: blst.P1, p: blst.BLS12_381_G1},
    {id: "P2", P: blst.P2, p: blst.BLS12_381_G2},
  ]) {
    await runner.run({
      id: `${id} to_affine`,
      before: () => {},
      beforeEach: () => new P(p),
      run: (p) => p.to_affine(),
    });

    await runner.run({
      id: `${id} to_jacobian`,
      before: () => {},
      beforeEach: () => p.dup(),
      run: (p) => p.to_jacobian(),
    });

    await runner.run({
      id: `${id} compress`,
      before: () => {},
      beforeEach: () => new P(p),
      run: (p) => p.compress(),
    });

    await runner.run({
      id: `${id} serialize`,
      before: () => {},
      beforeEach: () => new P(p),
      run: (p) => p.serialize(),
    });

    await runner.run({
      id: `${id} from compress`,
      before: () => {},
      beforeEach: () => new P(p).compress(),
      run: (bytes) => new P(bytes),
    });

    await runner.run({
      id: `${id} from serialize`,
      before: () => {},
      beforeEach: () => new P(p).serialize(),
      run: (bytes) => new P(bytes),
    });
  }

  // Point validation
  {
    const sk = new blst.SecretKey();
    sk.from_bendian(Buffer.alloc(32, 1));

    for (const [id, p] of Object.entries({
      P1: new blst.P1(sk),
      P2: new blst.P2(sk),
      P1_Affine: new blst.P1(sk).to_affine(),
      P2_Affine: new blst.P2(sk).to_affine(),
    })) {
      await runner.run({
        id: `${id} on_curve`,
        before: () => {},
        run: () => p.on_curve(),
      });

      await runner.run({
        id: `${id} in_group`,
        before: () => {},
        run: () => p.in_group(),
      });

      await runner.run({
        id: `${id} is_inf`,
        before: () => {},
        run: () => p.is_inf(),
      });

      await runner.run({
        id: `${id} dup`,
        before: () => {},
        run: () => p.dup(),
      });
    }
  }

  // Benchmark the cost of having pubkeys cached as P1 or P1_Affine

  for (const aggCount of [128, 256]) {
    const iArr = Array.from({length: aggCount}, (v, i) => i);
    const sks = iArr.map((i) => {
      const sk = new blst.SecretKey();
      sk.from_bendian(Buffer.alloc(32, i + 1));
      return sk;
    });

    // Fastest than using .dup()
    await runner.run<InstanceType<typeof blst.P1>[]>({
      id: `BLS aggregate ${aggCount} from P1[] with .add`,
      before: () => sks.map((sk) => new blst.P1(sk)),
      run: (pks) => {
        const agg = new blst.P1();
        for (const pk of pks) agg.add(pk);
      },
    });

    await runner.run<InstanceType<typeof blst.P1>[]>({
      id: `BLS aggregate ${aggCount} from P1[] with .add add .dup first`,
      before: () => sks.map((sk) => new blst.P1(sk)),
      run: (pks) => {
        const agg = pks[0].dup();
        for (const pk of pks.slice(1)) agg.add(pk);
      },
    });

    await runner.run<InstanceType<typeof blst.P1_Affine>[]>({
      id: `BLS aggregate ${aggCount} from P1_Aff[] with .add`,
      before: () => sks.map((sk) => new blst.P1(sk).to_affine()),
      run: (pks) => {
        const agg = new blst.P1();
        for (const pk of pks) agg.add(pk);
      },
    });

    // This is way more expensive because .aggregate does a group check on each key
    await runner.run<InstanceType<typeof blst.P1_Affine>[]>({
      id: `BLS aggregate ${aggCount} from P1_Aff[] with .aggregate`,
      before: () => sks.map((sk) => new blst.P1(sk).to_affine()),
      run: (pks) => {
        const agg = new blst.P1();
        for (const pk of pks) agg.aggregate(pk);
      },
    });
  }

  // BLS lib

  await runner.run({
    id: "BLS signature",
    before: () => {},
    beforeEach: () => SecretKey.fromKeygen(crypto.randomBytes(32)),
    run: (sk) => {
      sk.sign(msg);
    },
  });

  await runner.run<{pk: PublicKey; sig: Signature}>({
    id: "BLS verification",
    before: () => {
      const sk = SecretKey.fromKeygen(crypto.randomBytes(32));
      const pk = sk.toPublicKey();
      const sig = sk.sign(msg);
      return {pk, sig};
    },
    run: ({pk, sig}) => {
      verify(msg, pk, sig);
    },
  });

  for (const n of [32, 128]) {
    await runner.run<{pks: PublicKey[]; sig: Signature}>({
      id: `BLS agg verif of 1 msg by ${n} pubkeys`,
      before: () => {
        const pks: PublicKey[] = [];
        const sigs: Signature[] = [];

        for (let i = 0; i < n; i++) {
          const sk = SecretKey.fromKeygen(Buffer.alloc(32, i));
          pks.push(sk.toPublicKey());
          sigs.push(sk.sign(msg));
        }

        const sig = aggregateSignatures(sigs);
        return {pks, sig};
      },
      run: ({pks, sig}) => {
        fastAggregateVerify(msg, pks, sig);
      },
    });
  }

  // BLS verif of 6 msgs by 6 pubkeys
  // Serial batch verify 6 msgs by 6 pubkeys (with blinding)
  // Parallel batch verify of 6 msgs by 6 pubkeys (with blinding)
})();
