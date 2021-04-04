import { blst, Pairing } from "../../../src/bindings";
import { fromHex, runInstanceTestCases } from "../../utils";

describe("Pairing", () => {
  const sample = {
    keygen: "********************************", // Must be at least 32 bytes
    p2: fromHex(
      "0b02218c125b91b779e82ade498d34385a1a91b29ca1a8918e280af87f8587c3ee555cbdf666c788e71bba7c1567057f100af1be00e1752af14223de1714ff8d89ec2732f43c59db68ed46f9fc13a9c75cee9dc3db9eefd1af473aa031f26ae603ab35eee12ba240f311d2515367c84c9cd2f09eb12c9762abec8438f186706e759c0aef0ecf2b2cf315d47979d1fb51105147843d489c49b890b0c7e3a43ef75743568f5d14bc8b206c973356226a0f3ba36d73aab5cf6246e4e5ef2ebdce1a"
    ),
    p2Comp: fromHex(
      "8b02218c125b91b779e82ade498d34385a1a91b29ca1a8918e280af87f8587c3ee555cbdf666c788e71bba7c1567057f100af1be00e1752af14223de1714ff8d89ec2732f43c59db68ed46f9fc13a9c75cee9dc3db9eefd1af473aa031f26ae6"
    ),
  };

  const sk = new blst.SecretKey();
  sk.keygen(sample.keygen);
  const p1 = new blst.P1(sk);
  const p2 = new blst.P2(sk);
  const p1Affine = new blst.P1_Affine(p1);
  const p2Affine = new blst.P2_Affine(p2);

  const msg = "assertion"; // this what we're signing
  const DST = "MY-DST"; // domain separation tag

  runInstanceTestCases<Pairing>(
    {
      aggregate: [{ args: [p2Affine, p1Affine, msg], res: 0 }],
      mul_n_aggregate: [
        {
          args: [
            p2Affine,
            p1Affine,
            Buffer.alloc(32, 0),
            Buffer.alloc(32, 0),
            p1.serialize(),
          ],
          res: 0,
        },
      ],
      commit: [],
      merge: [{ args: [new blst.Pairing(true, DST)], res: 0 }],
      finalverify: [{ args: [], res: false }],
    },
    function getPairing() {
      return new blst.Pairing(true, DST);
    }
  );
});
