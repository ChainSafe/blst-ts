import { spawn, Pool, Worker, Thread } from "threads";
import * as bls from "../../../../src/lib";
import { WorkerApi } from "./worker";

type ThreadType = Thread &
  {
    [K in keyof WorkerApi]: (
      ...args: Parameters<WorkerApi[K]>
    ) => Promise<ReturnType<WorkerApi[K]>>;
  };

export class BlsMultiThreadNaive {
  pool: Pool<ThreadType>;

  constructor(workerCount?: number) {
    this.pool = Pool(
      () => (spawn(new Worker("./worker")) as any) as Promise<ThreadType>,
      workerCount
    );
  }

  async destroy() {
    await this.pool.terminate(true);
  }

  async verify(
    msg: Uint8Array,
    pk: bls.PublicKey,
    sig: bls.Signature
  ): Promise<boolean> {
    return this.pool.queue((worker) =>
      worker.verify(msg, pk.serialize(), sig.serialize())
    );
  }

  async verifyMultipleAggregateSignatures(
    sets: bls.SignatureSet[]
  ): Promise<boolean> {
    return this.pool.queue((worker) =>
      worker.verifyMultipleAggregateSignatures(
        sets.map((s) => ({
          msg: s.msg,
          pk: s.pk.serialize(),
          sig: s.sig.serialize(),
        }))
      )
    );
  }

  // Test methods

  async ping(n: number): Promise<number> {
    return await this.pool.queue((worker) => worker.ping(n));
  }

  async receive(
    msgs: Uint8Array[],
    pks: Uint8Array[],
    sigs: Uint8Array[]
  ): Promise<void> {
    await this.pool.queue((worker) => worker.receive(msgs, pks, sigs));
  }

  async serders(
    msgs: Uint8Array[],
    pks: bls.PublicKey[],
    sigs: bls.Signature[]
  ): Promise<void> {
    await this.pool.queue((worker) =>
      worker.serders(
        msgs,
        pks.map((pk) => pk.serialize()),
        sigs.map((sig) => sig.serialize())
      )
    );
  }
}
