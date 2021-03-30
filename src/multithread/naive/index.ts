import { worker } from "cluster";
import { spawn, Pool, Worker, Thread } from "threads";
import * as bls from "../../lib";
import { WorkerApi } from "./worker";

type ThreadType = Thread &
  {
    [K in keyof WorkerApi]: (
      ...args: Parameters<WorkerApi[K]>
    ) => Promise<ReturnType<WorkerApi[K]>>;
  };

export class BlsMultiThreadNaive {
  pool: Pool<ThreadType>;
  workerCount = 8;

  constructor() {
    this.pool = Pool(
      () => (spawn(new Worker("./worker.js")) as any) as Promise<ThreadType>,
      this.workerCount
    );
  }

  async destroy() {
    await this.pool.terminate(true);
  }

  async startAll() {
    await Promise.all(
      Array.from({ length: this.workerCount }, (_, i) => i).map((i) =>
        this.pool.queue((worker) => worker.echo(i))
      )
    );
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
    msgs: Uint8Array[],
    pks: bls.PublicKey[],
    sigs: bls.Signature[]
  ): Promise<boolean> {
    return this.pool.queue((worker) =>
      worker.verifyMultipleAggregateSignatures(
        msgs,
        pks.map((pk) => pk.serialize()),
        sigs.map((sig) => sig.serialize())
      )
    );
  }
}
