import { blst } from "../bindings";
import { P2, P2_Affine } from "../types/P2";
import { fromHex, runInstanceTestCases } from "./utils";

describe("P2", () => {
  const sample = {
    keygen: "random",
    p2: fromHex(
      "0b02218c125b91b779e82ade498d34385a1a91b29ca1a8918e280af87f8587c3ee555cbdf666c788e71bba7c1567057f100af1be00e1752af14223de1714ff8d89ec2732f43c59db68ed46f9fc13a9c75cee9dc3db9eefd1af473aa031f26ae603ab35eee12ba240f311d2515367c84c9cd2f09eb12c9762abec8438f186706e759c0aef0ecf2b2cf315d47979d1fb51105147843d489c49b890b0c7e3a43ef75743568f5d14bc8b206c973356226a0f3ba36d73aab5cf6246e4e5ef2ebdce1a"
    ),
    p2Comp: fromHex(
      "8b02218c125b91b779e82ade498d34385a1a91b29ca1a8918e280af87f8587c3ee555cbdf666c788e71bba7c1567057f100af1be00e1752af14223de1714ff8d89ec2732f43c59db68ed46f9fc13a9c75cee9dc3db9eefd1af473aa031f26ae6"
    ),
  };

  const sk = new blst.SecretKey();
  sk.keygen(sample.keygen);
  const p2 = new blst.P2(sk);
  const p2Affine = new blst.P2_Affine(p2);

  describe("P2", () => {
    const msg = "msg";
    const dst = "my-dst";

    runInstanceTestCases<Omit<P2, "aggregate">>(
      {
        to_affine: [{ args: [], res: p2Affine }],
        serialize: [{ args: [], res: sample.p2 }],
        compress: [{ args: [], res: sample.p2Comp }],
        is_inf: [{ args: [], res: false }],
        sign_with: [
          {
            args: [sk],
            res: "0d884899b9e5a4853e9bc2e93cb1523c16110d232f576cd0da00540f6b1712c86928a034c16e6e6ba0e8654d43a296be09eef3932ee42e9419feb5f04d825082555cf35b9583cb057d18d23dc8c45ccf1fd75bb3fbf44ca454e54adbc40dba891690aecefcfa12c4b395b4066b3dc940eae9f61c5df6c37c2db4531d57e222cd47ee5dc3a28950154748e85ae381ace416dee5ba11c81bb6aa54912df15f55e17c446f83298eca372963c23d9bd19754db445bb1981f791dd51e52e8f5a0e8c1" as any,
          },
        ],
        hash_to: [
          {
            args: [msg, dst, p2.serialize()],
            res: "0bcb68d75f0b7494fa198f59d417b440ad8d9bcd5b3c514f8427e64905e1189f6712aaf663f2aa455c55527e1a18c24a0e03f292993ac9aac5817b2ed518aa916f017f029b3db9730f4f431e4f6a77d8ade10ea3a291cdaf2986558223b66ed9146d45fce628e83f9469d565f205bc56d878ab8fcdd20d52c6413ef1c563bc308bdb26cad6234e6f96a43958d2e829410508042c19bcd63bd45fe4cb96021be6a2f7a16100ba032343af311f745e01ebc8a055bf3df5f7329172e02dc7d7e86d" as any,
          },
        ],
        encode_to: [
          {
            args: [msg, dst, p2.serialize()],
            res: "073e3652441ff650582508193a7667718549180cc87212b9f8eb8d349778cf9d0851ad28fddc652effe3467880ef85500ebeec0dc4c754184b403c12aa0fb2fad29995f9be139812789ea4a30c09bc1a1550074d2078792b678b58f6de0e30d70e02e8dbfe77591ee989bd198e7282971bf453d06a4813490c7f6766702680d01883753a964e26c8e4219c3073e762500d2063c33b2d7a6e3a2d296ea309cff55b013b12677e327f734e6e178849de9f8212f43d163c8997d645b4500948689d" as any,
          },
        ],
      },
      function getP2() {
        return new blst.P2(sk);
      }
    );
  });

  describe("P2_Affine", () => {
    runInstanceTestCases<P2_Affine>(
      {
        to_jacobian: [{ args: [], res: p2 }],
        serialize: [{ args: [], res: sample.p2 }],
        compress: [{ args: [], res: sample.p2Comp }],
        on_curve: [{ args: [], res: true }],
        in_group: [{ args: [], res: true }],
        is_inf: [{ args: [], res: false }],
      },
      function getP2Affine() {
        return new blst.P2_Affine(p2);
      }
    );
  });
});
