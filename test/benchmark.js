const { SecretKey, verify } = require("@chainsafe/blst");
const { run, mark } = require("micro-bmark");
const { randomBytes } = require("crypto");
const rand = () => new Uint8Array(randomBytes(32));

run(async () => {
  const sk = SecretKey.fromKeygen(rand());
  const msg = randomBytes(32);
  const pk = sk.toPublicKey();
  const sig = sk.sign(msg);
  await mark("getPublicKey", () => SecretKey.fromKeygen(rand()).toPublicKey());
  await mark("sign", () => sk.sign(rand()));
  await mark("verify", () => verify(msg, pk, sig));
});
