import { expect } from "chai";
import * as bls from "../../../../src/lib";
import { BlsMultiThreadNaive } from "./index";
import { warmUpWorkers } from "./utils";

describe("bls pool naive", function () {
  const nodeJsSemver = process.versions.node;
  const nodeJsMajorVer = parseInt(nodeJsSemver.split(".")[0]);
  if (!nodeJsMajorVer) {
    throw Error(`Error parsing NodeJS version: ${nodeJsSemver}`);
  }
  if (nodeJsMajorVer < 12) {
    return; // Skip everything
  }

  const n = 16;
  let pool: BlsMultiThreadNaive;

  before("Create pool and warm-up wallets", async function () {
    // Starting all threads may take a while due to ts-node compilation
    this.timeout(20 * 1000);
    pool = new BlsMultiThreadNaive();
    await warmUpWorkers(pool);
  });

  after("Destroy pool", async function () {
    this.timeout(20 * 1000);
    await pool.destroy();
  });

  describe("1 msg, 1 pk", () => {
    const msg = Buffer.from("sample-msg");
    const sk = bls.SecretKey.fromKeygen(Buffer.alloc(32, 1));
    const pk = sk.toPublicKey();
    const sig = sk.sign(msg);

    it("verify", async () => {
      const valid = await pool.verify(msg, pk, sig);
      expect(valid).to.equal(true);
    });
  });

  describe("1 msg, N pks", () => {
    const msg = Buffer.from("sample-msg");
    const sks: bls.SecretKey[] = [];
    const pks: bls.PublicKey[] = [];
    const sigs: bls.Signature[] = [];

    for (let i = 0; i < n; i++) {
      const sk = bls.SecretKey.fromKeygen(Buffer.alloc(32, i));
      sks.push(sk);
      pks.push(sk.toPublicKey());
      sigs.push(sk.sign(msg));
    }

    it("verify", async () => {
      const validArr = await Promise.all(
        pks.map((_, i) => pool.verify(msg, pks[i], sigs[i]))
      );
      for (const [i, valid] of validArr.entries()) {
        expect(valid).to.equal(true, `Invalid ${i}`);
      }
    });

    it("fastAggregateVerify", async () => {
      const valid = await pool.verify(
        msg,
        bls.aggregatePubkeys(pks),
        bls.aggregateSignatures(sigs)
      );
      expect(valid).to.equal(true);
    });
  });

  describe("N msgs, N pks", () => {
    const sets: bls.SignatureSet[] = [];
    for (let i = 0; i < n; i++) {
      const msg = Buffer.alloc(32, i);
      const sk = bls.SecretKey.fromKeygen(Buffer.alloc(32, i));
      sets.push({ msg, pk: sk.toPublicKey(), sig: sk.sign(msg) });
    }

    it("verify", async () => {
      const validArr = await Promise.all(
        sets.map((s) => pool.verify(s.msg, s.pk, s.sig))
      );
      for (const [i, valid] of validArr.entries()) {
        expect(valid).to.equal(true, `Invalid ${i}`);
      }
    });

    it("verifyMultipleAggregateSignatures", async () => {
      const valid = await pool.verifyMultipleAggregateSignatures(sets);
      expect(valid).to.equal(true);
    });
  });
});
