import { expect } from "chai";
import * as bls from "../../../src/lib";

describe("bls lib", () => {
  const n = 3;

  describe("1 msg, 1 pk", () => {
    const msg = Buffer.from("sample-msg");

    const sk = bls.SecretKey.fromKeygen(Buffer.alloc(32, 1));
    const pk = sk.toPublicKey();
    const sig = sk.sign(msg);

    it("verify", () => {
      const valid = bls.verify(msg, pk, sig);
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

    it("verify", () => {
      for (let i = 0; i < n; i++) {
        const valid = bls.verify(msg, pks[i], sigs[i]);
        expect(valid).to.equal(true, `Invalid ${i}`);
      }
    });

    it("fastAggregateVerify", () => {
      const valid = bls.fastAggregateVerify(
        msg,
        pks,
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

    it("verify", () => {
      for (const [i, { msg, pk, sig }] of sets.entries()) {
        const valid = bls.verify(msg, pk, sig);
        expect(valid).to.equal(true, `Invalid ${i}`);
      }
    });

    it("aggregateVerify", () => {
      const valid = bls.aggregateVerify(
        sets.map((s) => s.msg),
        sets.map((s) => s.pk),
        bls.aggregateSignatures(sets.map((s) => s.sig))
      );
      expect(valid).to.equal(true);
    });

    it("verifyMultipleAggregateSignatures", () => {
      const valid = bls.verifyMultipleAggregateSignatures(sets);
      expect(valid).to.equal(true);
    });
  });
});
