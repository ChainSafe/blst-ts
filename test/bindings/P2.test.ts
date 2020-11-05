import {
  blst,
  BLST_ERROR,
  P2,
  P2_Affine,
  P2Constructor,
} from "../../src/bindings";
import { fromHex, runInstanceTestCases } from "../utils";

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

  const msg = "assertion"; // this what we're signing
  const DST = "MY-DST"; // domain separation tag

  describe("P2", () => {
    runInstanceTestCases<P2>(
      {
        to_affine: [{ args: [], res: p2Affine }],
        serialize: [{ args: [], res: sample.p2 }],
        compress: [{ args: [], res: sample.p2Comp }],
        is_inf: [{ args: [], res: false }],
        // TODO: Skip tests for now
        aggregate: [],
        sign_with: [
          {
            args: [sk],
            res: "0d884899b9e5a4853e9bc2e93cb1523c16110d232f576cd0da00540f6b1712c86928a034c16e6e6ba0e8654d43a296be09eef3932ee42e9419feb5f04d825082555cf35b9583cb057d18d23dc8c45ccf1fd75bb3fbf44ca454e54adbc40dba891690aecefcfa12c4b395b4066b3dc940eae9f61c5df6c37c2db4531d57e222cd47ee5dc3a28950154748e85ae381ace416dee5ba11c81bb6aa54912df15f55e17c446f83298eca372963c23d9bd19754db445bb1981f791dd51e52e8f5a0e8c1" as any,
          },
        ],
        hash_to: [
          {
            args: [msg, DST, p2.serialize()],
            res: "18a8e36a5750e483b567214d1f1e008ce5565b954ee5aac3453d682fb857a37e561fc207dce71cef2bbd969446fb2d0602e30269a02e71aa1dbe0f68169990af3c1dbc79d6ad2ac7eaee6e1cb1f1fed225ce95027982be4d5d87f48a81cadb2e166dac2f4c93872f0bfdfe09c03e151e6c48f9cd7fdc32a36ce8cd8e1a8327c5dbd48cae96207238b78c364c9361f60d05cd1b702a5b830fe21db7ca0ce3e321a469aee68ebeabc03f9356cf7443e9bde06ce0215da35b6f7f764adc34735aa2" as any,
          },
        ],
        encode_to: [
          {
            args: [msg, DST, p2.serialize()],
            res: "042b40191f8d16d0d264a1ef16ba3901a521d8ab4904f6ce98d6fb2afb3873260c48251667cfdb040f8d588ab88a68a20e81e197131b97547c8db6d59096ab9b76ebfff12c370752d546c2827d11024f919381f2ad4de702b2ae57c5437c2db113ec66cbdcf8e90c5cde93b23fad8355bb488d4ba3593f5fbd7a2d5df0e6748547d0dfc047927b6cebf6687b1e206aa80d10f4c398b9c29e47b8e08c37cc635baa0e7512d734ab282974ce835197297f1c699aee73c7ee1700eabd0bf42274e8" as any,
          },
        ],
        cneg: [
          {
            args: [true],
            res: "0b02218c125b91b779e82ade498d34385a1a91b29ca1a8918e280af87f8587c3ee555cbdf666c788e71bba7c1567057f100af1be00e1752af14223de1714ff8d89ec2732f43c59db68ed46f9fc13a9c75cee9dc3db9eefd1af473aa031f26ae61655dbfb585444595809d564efe3e48ac7a45ae642587b5cbb444e68052a85b5a90ff50fa284d4d2c6e92b86862daf5a09afca65fc374a50928af6ee5fa76de00d33f4f59670563446c43b6da08e8c14e308928b069e309d731a1a10d141dc91" as any,
          },
        ],
        // Error: Method add does not exist
        add: [],
        // Error: Method add does not exist
        dbl: [],
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
        to_jacobian: [{ args: [], res: p2 }],
        serialize: [{ args: [], res: sample.p2 }],
        compress: [{ args: [], res: sample.p2Comp }],
        on_curve: [{ args: [], res: true }],
        in_group: [{ args: [], res: true }],
        is_inf: [{ args: [], res: false }],
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
        add: [
          {
            args: [p2, p2Affine],
            res: "0bcc5b1ce23517101da650ee7e16ffade4f7db2fa62d426f2811312edac0ef4f8063915d1460cc8569e76d512a3d27270b50308570167b19d8649ec3883f9fb830497b26525bf69ac7a7703f827e0c5e6690a563474a3490f5b8f1d9546522a00d83d033e2d8cdab2467c253fb5ebede6793a825aec72018c52a78af18cf5ea04d6effa93e03bbdf248f2f3b88d866681543e9a8db5bc2b044c8dd9d5a5b85c432cd037e3dc137299a27cfa7cfbabbdbac074104d4ece21abc3a3432cd267bbc" as any,
          },
        ],
        dbl: [
          {
            args: [p2],
            res: "0bcc5b1ce23517101da650ee7e16ffade4f7db2fa62d426f2811312edac0ef4f8063915d1460cc8569e76d512a3d27270b50308570167b19d8649ec3883f9fb830497b26525bf69ac7a7703f827e0c5e6690a563474a3490f5b8f1d9546522a00d83d033e2d8cdab2467c253fb5ebede6793a825aec72018c52a78af18cf5ea04d6effa93e03bbdf248f2f3b88d866681543e9a8db5bc2b044c8dd9d5a5b85c432cd037e3dc137299a27cfa7cfbabbdbac074104d4ece21abc3a3432cd267bbc" as any,
          },
        ],
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
