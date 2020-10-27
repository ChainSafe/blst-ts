import { blst, BLST_ERROR, P1, P1_Affine, P1Constructor } from "../../src";
import { expectHex, fromHex, runInstanceTestCases } from "../utils";

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
        to_affine: [{ args: [], res: p1Affine }],
        serialize: [{ args: [], res: sample.p1 }],
        compress: [{ args: [], res: sample.p1Comp }],
        is_inf: [{ args: [], res: false }],
        // TODO: Skip tests for now
        aggregate: [],
        sign_with: [
          {
            args: [sk],
            res: "1265a6e886524edf0e7fbb38e9a11f48b42f06f6908d5fb45c2bb1e42e15120248c5650aaa0f4341a870d178092d1de00045a1ae994b159100019ff274739db4a96b4f8ee8041e0c50c1244aa668e5e280ce634a92eefe58811515a11bf87f90" as any,
          },
        ],
        hash_to: [
          {
            args: [msg, DST, p1.serialize()],
            res: "08f8e5a24ff68be5d8a5eb5116dc047f835ac3fcb2d4e827edfff3891164c6c86f42d647e6ce4702e3aac80dfa1764930c9907eca3b8b21719ffc91948a65b587fb658eafbe041322b4cfc34cfbe50f50abc4397a55058580e8ac36696519559" as any,
          },
        ],
        encode_to: [
          {
            args: [msg, DST, p1.serialize()],
            res: "062d9a6ba17d654cdcbe145562b1a91434bb4c5bf495b33fc0564f60b984f3ec60fcd067859b3ba01c58367369f88c4c138f61991d20190b397a75eef2c6cf06a24664b058b47cae4106e616671d810bab01290e48d1f0b2a8c225a414a60e40" as any,
          },
        ],
        cneg: [
          {
            args: [true],
            res: "0a0451b32b22d58e70d422aff996faac76b40aff096e233781b33e39232c62f7f8c2a89c88a1b9b13204f7a21aed8b9e16b9f91ed18a091d8774b33c379f88340f7bb04cb7b0dc5b4105fe9c9c29173560fc285baf7642e57d8588cd4cf4d2ec" as any,
          },
        ],
        // Error: Method add does not exist
        add: [],
        // Error: Method dbl does not exist
        dbl: [],
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
        to_jacobian: [{ args: [], res: p1 }],
        serialize: [{ args: [], res: sample.p1 }],
        compress: [{ args: [], res: sample.p1Comp }],
        on_curve: [{ args: [], res: true }],
        in_group: [{ args: [], res: true }],
        is_inf: [{ args: [], res: false }],
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
        add: [
          {
            args: [p1, p1Affine],
            res: "157d484df3b1e12b2c9128c446955d5c9f6c4e30362a8e33c51d7b67c9ac6e04b5213161822aec2a0c35eb0767887f9010b6a92c5278478c4b4e6ca827c1760bd1112f4bbaa0b4ad48b77caf6e5eaf4a77734a47c9c654ef5a3b0bc10c545bba" as any,
          },
        ],
        dbl: [
          {
            args: [p1],
            res: "157d484df3b1e12b2c9128c446955d5c9f6c4e30362a8e33c51d7b67c9ac6e04b5213161822aec2a0c35eb0767887f9010b6a92c5278478c4b4e6ca827c1760bd1112f4bbaa0b4ad48b77caf6e5eaf4a77734a47c9c654ef5a3b0bc10c545bba" as any,
          },
        ],
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
