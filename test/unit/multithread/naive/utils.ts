import os from "os";
import * as bls from "../../../../src/lib";
import { BlsMultiThreadNaive } from "./index";

export async function warmUpWorkers(pool: BlsMultiThreadNaive) {
  const msg = Buffer.alloc(32, 1);
  const sk = bls.SecretKey.fromKeygen(Buffer.alloc(32, 1));
  const pk = sk.toPublicKey();
  const sig = sk.sign(msg);

  await Promise.all(
    Array.from({ length: os.cpus().length }, (_, i) => i).map((i) =>
      pool.verify(msg, pk, sig)
    )
  );
}
