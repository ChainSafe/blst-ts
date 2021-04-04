import { blst } from "../../../src/bindings";

describe("blst sample case", () => {
  it("Should verify a signature", () => {
    const msg = "assertion"; // this what we're signing
    const DST = "MY-DST"; // domain separation tag

    type DataToSend = { pk_for_wire: Uint8Array; sig_for_wire: Uint8Array };

    ////////////////////////////////////////////////////////////////////////
    // generate public key and signature
    function userSender(): DataToSend {
      const SK = new blst.SecretKey();
      SK.keygen("*".repeat(32));
      const pk = new blst.P1(SK);
      const pk_for_wire = pk.serialize();

      const sig = new blst.P2();
      const sig_for_wire = sig
        .hash_to(msg, DST, pk_for_wire)
        .sign_with(SK)
        .serialize();

      return { pk_for_wire, sig_for_wire };
    }

    ////////////////////////////////////////////////////////////////////////
    // at this point 'pk_for_wire', 'sig_for_wire' and 'msg' are
    // "sent over network," so now on "receiver" side
    function userReceiver({ pk_for_wire, sig_for_wire }: DataToSend) {
      const sig = new blst.P2_Affine(sig_for_wire);
      const pk = new blst.P1_Affine(pk_for_wire);

      if (!pk.in_group()) throw "public key not in group"; // vet the public key

      var ctx = new blst.Pairing(true, DST);
      ctx.aggregate(pk, sig, msg, pk_for_wire);
      ctx.commit();
      if (!ctx.finalverify()) throw "final verify failed";
    }

    const dataSoSend = userSender();
    userReceiver(dataSoSend);
  });
});
