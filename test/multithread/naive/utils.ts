import os from "os";
import * as bls from "../../../src/lib";
import {BlsMultiThreadNaive} from "./index";

export async function warmUpWorkers(pool: BlsMultiThreadNaive) {
  const msg = Buffer.alloc(32, 1);
  const sk = bls.SecretKey.fromKeygen(Buffer.alloc(32, 1));
  const pk = sk.toPublicKey();
  const sig = sk.sign(msg);

  await Promise.all(Array.from({length: os.cpus().length}, (_, i) => i).map((i) => pool.verify(msg, pk, sig)));
}

export function chunkify<T>(arr: T[], chunkCount: number): T[][] {
  const chunkSize = Math.round(arr.length / chunkCount);
  const arrArr: T[][] = [];

  for (let i = 0, j = arr.length; i < j; i += chunkSize) {
    arrArr.push(arr.slice(i, i + chunkSize));
  }

  return arrArr;
}
