import { blst } from "../bindings";
import { P1, P1_Affine } from "../types/P1";
import { fromHex, runInstanceTestCases } from "./utils";

describe("P1", () => {
  const sample = {
    keygen: "random",
    p1: fromHex(
      "0a0451b32b22d58e70d422aff996faac76b40aff096e233781b33e39232c62f7f8c2a89c88a1b9b13204f7a21aed8b9e034718cb67f5dd7cc3a6f47a0bac24a354fb9b383bd43664262ad4045a87deeebdafd7a301ddbd1a3c797732b30ad7bf"
    ),
    p1Comp: fromHex(
      "8a0451b32b22d58e70d422aff996faac76b40aff096e233781b33e39232c62f7f8c2a89c88a1b9b13204f7a21aed8b9e"
    ),
  };

  const sk = new blst.SecretKey();
  sk.keygen(sample.keygen);
  const p1 = new blst.P1(sk);
  const p1Affine = new blst.P1_Affine(p1);

  describe("P1", () => {
    const msg = "msg";
    const dst = "my-dst";

    runInstanceTestCases<Omit<P1, "aggregate">>(
      {
        to_affine: [{ args: [], res: p1Affine }],
        serialize: [{ args: [], res: sample.p1 }],
        compress: [{ args: [], res: sample.p1Comp }],
        is_inf: [{ args: [], res: false }],
        sign_with: [
          {
            args: [sk],
            res: "1265a6e886524edf0e7fbb38e9a11f48b42f06f6908d5fb45c2bb1e42e15120248c5650aaa0f4341a870d178092d1de00045a1ae994b159100019ff274739db4a96b4f8ee8041e0c50c1244aa668e5e280ce634a92eefe58811515a11bf87f90" as any,
          },
        ],
        hash_to: [
          {
            args: [msg, dst, p1.serialize()],
            res: "1902ef62ef3857b4d9f9ee05a8e08825e3694b88d6171c21133cd413fd992257c0fc2beac67f2fc5b38d64debb3d1a700da0f74d53fe9818447839a1c2662d928c0fccbe04d103e98084bd60058ae60b78397ba2b3a84644554f5da81e7e49e7" as any,
          },
        ],
        encode_to: [
          {
            args: [msg, dst, p1.serialize()],
            res: "0fd32f1a61ef7015628ec5aeed35c0552c61e5293b97135fc43d61f5ed650cef1a373c5d9321f3dd407a5ca908cd9793094aec55e955511b934d3b5ebcc64d13038a9ce655da83da9f469961cc2070df3274efdbd4d24c46647257eb09e5db67" as any,
          },
        ],
      },
      function getP1() {
        return new blst.P1(sk);
      }
    );
  });

  describe("P1_Affine", () => {
    runInstanceTestCases<P1_Affine>(
      {
        to_jacobian: [{ args: [], res: p1 }],
        serialize: [{ args: [], res: sample.p1 }],
        compress: [{ args: [], res: sample.p1Comp }],
        on_curve: [{ args: [], res: true }],
        in_group: [{ args: [], res: true }],
        is_inf: [{ args: [], res: false }],
      },
      function getP1Affine() {
        return new blst.P1_Affine(p1);
      }
    );
  });
});
