import * as bls from "../../src/lib";

describe("bls lib", () => {
  before("init", () => {
    bls.init();
  });

  const n = 3;

  describe("1 msg, 1 pk", () => {
    const msg = Buffer.from("sample-msg");

    const sk = bls.SecretKey.fromKeygen(Uint8Array.from(Buffer.alloc(32, 1)));
    const pk = sk.toPublicKey();
    const sig = sk.sign(msg);

    it("verify", () => {
      bls.verify(msg, pk, sig);
    });
  });

  describe("1 msg, N pks", () => {
    const msg = Buffer.from("sample-msg");
    const sks: bls.SecretKey[] = [];
    const pks: bls.AggregatePublicKey[] = [];
    const sigs: bls.Signature[] = [];

    for (let i = 0; i < n; i++) {
      const sk = bls.SecretKey.fromKeygen(Uint8Array.from(Buffer.alloc(32, i)));
      sks.push(sk);
      pks.push(sk.toAggregatePublicKey());
      sigs.push(sk.sign(msg));
    }

    it("verify", () => {
      for (let i = 0; i < n; i++) {
        bls.verify(msg, pks[i].toPublicKey(), sigs[i]);
      }
    });

    it("fastAggregateVerify", () => {
      bls.fastAggregateVerify(
        msg,
        pks,
        bls.AggregateSignature.fromSignatures(sigs).toSignature()
      );
    });
  });

  describe("N msgs, N pks", () => {
    const msgs: Uint8Array[] = [];
    const sks: bls.SecretKey[] = [];
    const pks: bls.PublicKey[] = [];
    const sigs: bls.Signature[] = [];

    for (let i = 0; i < n; i++) {
      const msg = Uint8Array.from(Buffer.alloc(32, i));
      const sk = bls.SecretKey.fromKeygen(Uint8Array.from(Buffer.alloc(32, 1)));
      msgs.push(msg);
      sks.push(sk);
      pks.push(sk.toPublicKey());
      sigs.push(sk.sign(msg));
    }

    it("verify", () => {
      for (let i = 0; i < n; i++) {
        bls.verify(msgs[i], pks[i], sigs[i]);
      }
    });

    it("aggregateVerify", () => {
      bls.aggregateVerify(
        msgs,
        pks,
        bls.AggregateSignature.fromSignatures(sigs).toSignature()
      );
    });

    it("verifyMultipleAggregateSignatures", () => {
      bls.verifyMultipleAggregateSignatures(msgs, pks, sigs);
    });
  });
});
