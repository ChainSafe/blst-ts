import { expose } from "threads/worker";
import * as bls from "../../../src/lib";

export type WorkerApi = typeof workerApi;

const workerApi = {
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

  // Test methods
  ping(n: number) {
    return n;
  },
  receive(msgs: Uint8Array[], pks: Uint8Array[], sigs: Uint8Array[]) {},
  serders(msgs: Uint8Array[], pks: Uint8Array[], sigs: Uint8Array[]) {
    msgs;
    pks.map(bls.PublicKey.fromBytes);
    sigs.map(bls.Signature.fromBytes);
  },
};

expose(workerApi);
