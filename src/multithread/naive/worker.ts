import { expose } from "threads/worker";
import * as bls from "../../lib";

export type WorkerApi = typeof workerApi;

const workerApi = {
  echo(a: unknown) {
    return a;
  },
  verify(msg: Uint8Array, pk: Uint8Array, sig: Uint8Array) {
    return bls.verify(
      msg,
      bls.PublicKey.fromBytes(pk),
      bls.Signature.fromBytes(sig)
    );
  },
  verifyMultipleAggregateSignatures(
    msgs: Uint8Array[],
    pks: Uint8Array[],
    sigs: Uint8Array[]
  ) {
    return bls.verifyMultipleAggregateSignatures(
      msgs,
      pks.map(bls.PublicKey.fromBytes),
      sigs.map(bls.Signature.fromBytes)
    );
  },
};

expose(workerApi);
