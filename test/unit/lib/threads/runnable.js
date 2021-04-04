const bls = require("../../../../dist/lib");

const msg = Buffer.from("sample-msg");

const sk = bls.SecretKey.fromKeygen(Buffer.alloc(32, 1));
const pk = sk.toPublicKey();
const sig = sk.sign(msg);

bls.verify(msg, pk, sig);
