import { expect } from "chai";
import * as bls from "../../src/lib";

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
    const pks: bls.AggregatePublicKey[] = [];
    const sigs: bls.Signature[] = [];

    for (let i = 0; i < n; i++) {
      const sk = bls.SecretKey.fromKeygen(Buffer.alloc(32, i));
      sks.push(sk);
      pks.push(sk.toAggregatePublicKey());
      sigs.push(sk.sign(msg));
    }

    it("verify", () => {
      for (let i = 0; i < n; i++) {
        const valid = bls.verify(msg, pks[i].toPublicKey(), sigs[i]);
        expect(valid).to.equal(true, `Invalid ${i}`);
      }
    });

    it("fastAggregateVerify", () => {
      const valid = bls.fastAggregateVerify(
        msg,
        pks,
        bls.AggregateSignature.fromSignatures(sigs).toSignature()
      );
      expect(valid).to.equal(true);
    });
  });

  describe("N msgs, N pks", () => {
    const msgs: Uint8Array[] = [];
    const sks: bls.SecretKey[] = [];
    const pks: bls.PublicKey[] = [];
    const sigs: bls.Signature[] = [];

    for (let i = 0; i < n; i++) {
      const msg = Buffer.alloc(32, i);
      const sk = bls.SecretKey.fromKeygen(Buffer.alloc(32, 1));
      msgs.push(msg);
      sks.push(sk);
      pks.push(sk.toPublicKey());
      sigs.push(sk.sign(msg));
    }

    it("verify", () => {
      for (let i = 0; i < n; i++) {
        const valid = bls.verify(msgs[i], pks[i], sigs[i]);
        expect(valid).to.equal(true, `Invalid ${i}`);
      }
    });

    it("aggregateVerify", () => {
      const valid = bls.aggregateVerify(
        msgs,
        pks,
        bls.AggregateSignature.fromSignatures(sigs).toSignature()
      );
      expect(valid).to.equal(true);
    });

    it("verifyMultipleAggregateSignatures", () => {
      const valid = bls.verifyMultipleAggregateSignatures(msgs, pks, sigs);
      expect(valid).to.equal(true);
    });
  });
});
