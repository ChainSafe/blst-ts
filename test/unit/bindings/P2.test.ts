import {
  blst,
  BLST_ERROR,
  P2,
  P2_Affine,
  P2Constructor,
} from "../../../src/bindings";
import { fromHex, runInstanceTestCases } from "../../utils";

describe("P2", () => {
  const sample = {
    keygen: "********************************", // Must be at least 32 bytes
    p2: fromHex(
      "057565542eaa01ef2b910bf0eaba4d98a1e5b8b79cc425db08f8780732d0ea9bc85fc6175f272b2344bb27bc572ebf14022e52689dcedfccf44a00e5bd1aa59db44517217d6b0f21b372169ee761938c28914ddcb9663de54db288e760a8e14f0f465dc9f94edd3ea43442840e4ef6aeb51d1f77e8e5c5a0fadfb46f186f4644899c7cbefd6ead2b138b030b2914b748051cbab5d38fceb8bea84973ac08d1db5436f177dbcb11d9b7bbb39b6dc32047472f573c64be1d28fd848716c2844f88"
    ),
    p2Comp: fromHex(
      "a57565542eaa01ef2b910bf0eaba4d98a1e5b8b79cc425db08f8780732d0ea9bc85fc6175f272b2344bb27bc572ebf14022e52689dcedfccf44a00e5bd1aa59db44517217d6b0f21b372169ee761938c28914ddcb9663de54db288e760a8e14f"
    ),
  };

  const sk = new blst.SecretKey();
  sk.keygen(sample.keygen);
  const p2 = new blst.P2(sk);
  const p2Affine = new blst.P2_Affine(p2);

  const msg = "assertion"; // this what we're signing
  const DST = "MY-DST"; // domain separation tag

  describe("P2", () => {
    runInstanceTestCases<P2>(
      {
        dup: [{ args: [], res: new blst.P2(sk) }],
        to_affine: [{ args: [], res: p2Affine }],
        serialize: [{ args: [], res: sample.p2 }],
        compress: [{ args: [], res: sample.p2Comp }],
        on_curve: [{ args: [], res: true }],
        in_group: [{ args: [], res: true }],
        is_inf: [{ args: [], res: false }],
        is_equal: [{ args: [new blst.P2(sk)], res: true }],
        // TODO: Skip tests for now
        aggregate: [],
        sign_with: [
          {
            args: [sk],
            res: "10f5dcf6514280674046cf2d0d1003a62ff4b3ac83d7c5b7526b5fd35ccb639eb81108eaf88377c5ef2a0e0eadaec60e0c4dd51924c45080f302dc955fad6eef02c58b15be1599e9275f763381468f8cf3c13acf9b29d1bea4040d72f9e42ec80952797d1c1ced41fd36e66fe6e18d650570b0ed7badcbd5e702e752406c7a73bb3e53ae4c440d20e751a5d76e6fd2b40f91ed3b46df1908cad2b79cf50fcb9976c1be0fa107e2afe8789000724668ea28d243668e9219ac16e5b407478f625a" as any,
          },
        ],
        hash_to: [
          {
            args: [msg, DST, p2.serialize()],
            res: "0752f6536bd46980ab965bc19288c0b7a947c54f5b09d07599254c9ac66b9e30a8440fd8c53c833275837211d6140a480033743d2794018d9280d37e73ca030cfcfc870dbdd62bda8a100f1e237b960cc75ffe6bd5d5c637a8d659525062917605ab0e848c0d01d740bb4d03c3380704cadcd3dcd8de1bd08850fd6787a56b016bda6a8b9f2ea36301eb7d4b5e7f1ddd0cc36fb119d3d20493749cc146d3914e244dce67b09f645a556ec64b849245372258a164022c2b7d305f198e6ff32ba7" as any,
          },
        ],
        encode_to: [
          {
            args: [msg, DST, p2.serialize()],
            res: "084536d707307b83c841cdd5ce427bc73a77b88fe167b15f23a85e3a7049a4403f3b84f10855f0ef5e361b93dddee3b418d89f3e31d257caa91ddab18810a72210124353e7d2fc1be81834ca8ca4d609b377189b1e1fce59946d8cd9ec2c7de51254fe50be47ebcb706e2fec12c1558be92db177a9196d8bba4b88ace1d96194980abceeed35a0ff7aedebac9d774855180fb6823d581be6bee21364c2e247205ad580f3f641ed6f39a44424a24c14b48cc3f57f02eb6756ac986fca517cdc33" as any,
          },
        ],
        mult: [
          {
            args: [new Uint8Array([2])],
            res: "047e2e55ca05d77e8e051d2fe878db4bf96517bd44f7b8f26fd2acae6d166270faeeb121f2f073da979909fa1393e0e9194c271ed6023f2536c654312d4ebbed446c84e5f746c496b3e5efdb9ca81a57779c131a067f9c90610ac9fd9a0eaafc086b36516cc11aa30d86cbd335738bc272ce5ae8487c244104b3aa0ce7f2d4a1b1aac476d1baa66a12fc4c562511d919042d77ed5a4f8ed6a3dbaca06540e082ef1209b3a9d27c4adc35d28cb7fbee0836a07ead9579b9043fb056c24e108fbe" as any,
          },
        ],
        cneg: [
          {
            args: [true],
            res: "057565542eaa01ef2b910bf0eaba4d98a1e5b8b79cc425db08f8780732d0ea9bc85fc6175f272b2344bb27bc572ebf14022e52689dcedfccf44a00e5bd1aa59db44517217d6b0f21b372169ee761938c28914ddcb9663de54db288e760a8e14f0abab4204031095ba6e7653234fcb628af5a2c0d0a9f4d1e6c511e31de41afdf950f833fb3e552d4a673fcf4d6eaf36314e4573465f017e18c735e429742dafc10405a0d17ba00e5af751f0588edd5dcd77ca8c24c95e2d6bc7a78e93d7b5b23" as any,
          },
        ],
        neg: [
          {
            args: [],
            res: "057565542eaa01ef2b910bf0eaba4d98a1e5b8b79cc425db08f8780732d0ea9bc85fc6175f272b2344bb27bc572ebf14022e52689dcedfccf44a00e5bd1aa59db44517217d6b0f21b372169ee761938c28914ddcb9663de54db288e760a8e14f0abab4204031095ba6e7653234fcb628af5a2c0d0a9f4d1e6c511e31de41afdf950f833fb3e552d4a673fcf4d6eaf36314e4573465f017e18c735e429742dafc10405a0d17ba00e5af751f0588edd5dcd77ca8c24c95e2d6bc7a78e93d7b5b23" as any,
          },
        ],
        add: [
          {
            args: [p2Affine],
            res: "047e2e55ca05d77e8e051d2fe878db4bf96517bd44f7b8f26fd2acae6d166270faeeb121f2f073da979909fa1393e0e9194c271ed6023f2536c654312d4ebbed446c84e5f746c496b3e5efdb9ca81a57779c131a067f9c90610ac9fd9a0eaafc086b36516cc11aa30d86cbd335738bc272ce5ae8487c244104b3aa0ce7f2d4a1b1aac476d1baa66a12fc4c562511d919042d77ed5a4f8ed6a3dbaca06540e082ef1209b3a9d27c4adc35d28cb7fbee0836a07ead9579b9043fb056c24e108fbe" as any,
          },
        ],
        dbl: [
          {
            args: [],
            res: "047e2e55ca05d77e8e051d2fe878db4bf96517bd44f7b8f26fd2acae6d166270faeeb121f2f073da979909fa1393e0e9194c271ed6023f2536c654312d4ebbed446c84e5f746c496b3e5efdb9ca81a57779c131a067f9c90610ac9fd9a0eaafc086b36516cc11aa30d86cbd335738bc272ce5ae8487c244104b3aa0ce7f2d4a1b1aac476d1baa66a12fc4c562511d919042d77ed5a4f8ed6a3dbaca06540e082ef1209b3a9d27c4adc35d28cb7fbee0836a07ead9579b9043fb056c24e108fbe" as any,
          },
        ],
      },
      function getP2() {
        return new blst.P2(sk);
      }
    );
  });

  describe("P2_Affine", () => {
    const p1 = new blst.P1(sk);
    const p1Affine = new blst.P1_Affine(p1);

    runInstanceTestCases<P2_Affine>(
      {
        dup: [{ args: [], res: new blst.P2_Affine(p2) }],
        to_jacobian: [{ args: [], res: p2 }],
        serialize: [{ args: [], res: sample.p2 }],
        compress: [{ args: [], res: sample.p2Comp }],
        on_curve: [{ args: [], res: true }],
        in_group: [{ args: [], res: true }],
        is_inf: [{ args: [], res: false }],
        is_equal: [{ args: [new blst.P2_Affine(p2)], res: true }],
        core_verify: [
          {
            args: [p1Affine, true, msg, DST],
            res: BLST_ERROR.BLST_VERIFY_FAIL,
          },
        ],
      },
      function getP2Affine() {
        return new blst.P2_Affine(p2);
      }
    );
  });

  describe("static", () => {
    runInstanceTestCases<P2Constructor>(
      {
        generator: [
          {
            args: [],
            res: "13e02b6052719f607dacd3a088274f65596bd0d09920b61ab5da61bbdc7f5049334cf11213945d57e5ac7d055d042b7e024aa2b2f08f0a91260805272dc51051c6e47ad4fa403b02b4510b647ae3d1770bac0326a805bbefd48056c8c121bdb80606c4a02ea734cc32acd2b02bc28b99cb3e287e85a763af267492ab572e99ab3f370d275cec1da1aaa9075ff05f79be0ce5d527727d6e118cc9cdc6da2e351aadfd9baa8cbdd3a76d429a695160d12c923ac9cc3baca289e193548608b82801" as any,
          },
        ],
      },
      () => blst.P2
    );
  });
});
