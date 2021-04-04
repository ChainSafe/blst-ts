import {
  blst,
  BLST_ERROR,
  P1,
  P1_Affine,
  P1Constructor,
} from "../../../src/bindings";
import { expectHex, fromHex, runInstanceTestCases } from "../../utils";

describe("P1", () => {
  const sample = {
    keygen: "********************************", // Must be at least 32 bytes
    p1: fromHex(
      "0ae7e5822ba97ab07877ea318e747499da648b27302414f9d0b9bb7e3646d248be90c9fdaddfdb93485a6e9334f0109301f36856007e1bc875ab1b00dbf47f9ead16c5562d889d8b270002ade81e78d473204fcb51ede8659bce3d95c67903bc"
    ),
    p1Comp: fromHex(
      "8ae7e5822ba97ab07877ea318e747499da648b27302414f9d0b9bb7e3646d248be90c9fdaddfdb93485a6e9334f01093"
    ),
  };

  const sk = new blst.SecretKey();
  sk.keygen(sample.keygen);
  const p1 = new blst.P1(sk);
  const p1Affine = new blst.P1_Affine(p1);

  const msg = "assertion"; // this what we're signing
  const DST = "MY-DST"; // domain separation tag

  describe("P1", () => {
    it("From serialized", () => {
      expectHex(new blst.P1(sample.p1).serialize(), sample.p1);
    });
    it("From compressed", () => {
      expectHex(new blst.P1(sample.p1Comp).serialize(), sample.p1);
    });

    runInstanceTestCases<P1>(
      {
        dup: [{ args: [], res: new blst.P1(sk) }],
        to_affine: [{ args: [], res: p1Affine }],
        serialize: [{ args: [], res: sample.p1 }],
        compress: [{ args: [], res: sample.p1Comp }],
        on_curve: [{ args: [], res: true }],
        in_group: [{ args: [], res: true }],
        is_inf: [{ args: [], res: false }],
        is_equal: [{ args: [new blst.P1(sk)], res: true }],
        // TODO: Skip tests for now
        aggregate: [],
        sign_with: [
          {
            args: [sk],
            res: "0c3584dae7a2955145df1e792031e13b7bc1df4c033f59275ad3ecd2d6e6abc198bb5b76fa536b1689ddec11b191b25512eb69e2383a632201809a1fb67deede5aabe258726607c97bc5e17b30b4d26a4fd43cb7bb823d36a5c405a8ec1adc88" as any,
          },
        ],
        hash_to: [
          {
            args: [msg, DST, p1.serialize()],
            res: "0c52b57688e9659b326258de28f055137fbf0a408aa646f66fd6898afaa0c6b46d6e0974a4741d6b712b4b9b283159a617d60420d044b26613893c96c83029fae39264ba803fb08267db92b260e1878a438bb988826383ed1121ee27df8dc4b0" as any,
          },
        ],
        encode_to: [
          {
            args: [msg, DST, p1.serialize()],
            res: "01fa4ac72140c2f714c135fff2bc3e44f19e6aa65f7ed5d1329d4e404c83e0479bba01f212a17341e325b538fd8c673d054fe059092979fcf6cecf2e81b5a35bc2735b329c446820bb3b7f5bd227c284c7e99712f07fbccd4ae08bc27280d502" as any,
          },
        ],
        mult: [
          {
            // BigIng works fine but breaks in older versions of node
            args: [new Uint8Array([2])],
            res: "1995e17c244b8be52aae259364646381d9a0d3b4a83c45c40ccfce11952eb259007b07e5bf96a622acb6ae0a8b94063617a8a12cc833156f99c573b4416c21e50fca56be4df635e89f63ae81108becef79ac015f4d5cd33bea4484bf278f2e7c" as any,
          },
        ],
        cneg: [
          {
            args: [true],
            res: "0ae7e5822ba97ab07877ea318e747499da648b27302414f9d0b9bb7e3646d248be90c9fdaddfdb93485a6e9334f01093180da9943901cad1d5708cb567572d38b760862ec5fc75344030cff30e927d4fab8bb0335f66179a1e30c26a3986a6ef" as any,
          },
        ],
        neg: [
          {
            args: [],
            res: "0ae7e5822ba97ab07877ea318e747499da648b27302414f9d0b9bb7e3646d248be90c9fdaddfdb93485a6e9334f01093180da9943901cad1d5708cb567572d38b760862ec5fc75344030cff30e927d4fab8bb0335f66179a1e30c26a3986a6ef" as any,
          },
        ],
        add: [
          {
            args: [p1Affine],
            res: "1995e17c244b8be52aae259364646381d9a0d3b4a83c45c40ccfce11952eb259007b07e5bf96a622acb6ae0a8b94063617a8a12cc833156f99c573b4416c21e50fca56be4df635e89f63ae81108becef79ac015f4d5cd33bea4484bf278f2e7c" as any,
          },
        ],
        dbl: [
          {
            args: [],
            res: "1995e17c244b8be52aae259364646381d9a0d3b4a83c45c40ccfce11952eb259007b07e5bf96a622acb6ae0a8b94063617a8a12cc833156f99c573b4416c21e50fca56be4df635e89f63ae81108becef79ac015f4d5cd33bea4484bf278f2e7c" as any,
          },
        ],
      },
      function getP1() {
        return new blst.P1(sk);
      }
    );
  });

  describe("P1_Affine", () => {
    const p2 = new blst.P2(sk);
    const p2Affine = new blst.P2_Affine(p2);

    it("From serialized", () => {
      expectHex(new blst.P1_Affine(sample.p1).serialize(), sample.p1);
    });
    it("From compressed", () => {
      expectHex(new blst.P1_Affine(sample.p1Comp).serialize(), sample.p1);
    });

    runInstanceTestCases<P1_Affine>(
      {
        dup: [{ args: [], res: new blst.P1_Affine(p1) }],
        to_jacobian: [{ args: [], res: p1 }],
        serialize: [{ args: [], res: sample.p1 }],
        compress: [{ args: [], res: sample.p1Comp }],
        on_curve: [{ args: [], res: true }],
        in_group: [{ args: [], res: true }],
        is_inf: [{ args: [], res: false }],
        is_equal: [{ args: [new blst.P1_Affine(p1)], res: true }],
        core_verify: [
          {
            args: [p2Affine, true, msg, DST],
            res: BLST_ERROR.BLST_VERIFY_FAIL,
          },
        ],
      },
      function getP1Affine() {
        return new blst.P1_Affine(p1);
      }
    );
  });

  describe("static", () => {
    runInstanceTestCases<P1Constructor>(
      {
        generator: [
          {
            args: [],
            res: "17f1d3a73197d7942695638c4fa9ac0fc3688c4f9774b905a14e3a3f171bac586c55e83ff97a1aeffb3af00adb22c6bb08b3f481e3aaa0f1a09e30ed741d8ae4fcf5e095d5d00af600db18cb2c04b3edd03cc744a2888ae40caa232946c5e7e1" as any,
          },
        ],
      },
      () => blst.P1
    );
  });
});
