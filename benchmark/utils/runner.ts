type PromiseOptional<T> = T | Promise<T>;
export type BenchmarkOpts = {
  runs?: number;
  maxMs?: number;
};

export class BenchmarkRunner {
  opts: BenchmarkOpts;
  constructor(title: string, opts?: BenchmarkOpts) {
    this.opts = opts || {};
    printTitle(title);
  }

  async run<T1, T2 = T1, R = void>({
    before,
    beforeEach,
    run,
    check,
    id,
    ...opts
  }: RunOpts<T1, T2, R>): Promise<number> {
    const runs = opts.runs || this.opts.runs || 512;
    const maxMs = opts.maxMs || this.opts.maxMs || 2000;

    const diffsNanoSec: bigint[] = [];

    const inputAll = await before();

    let start = Date.now();
    let i = 0;
    while (i++ < runs && Date.now() - start < maxMs) {
      const input = beforeEach
        ? await beforeEach(inputAll, i)
        : ((inputAll as unknown) as T2);

      const start = process.hrtime.bigint();
      const result = await run(input);
      const end = process.hrtime.bigint();

      if (check && check(result)) throw Error("Result fails check test");

      diffsNanoSec.push(end - start);
    }

    const average = averageBigint(diffsNanoSec);
    const averageNs = Number(average);
    // eslint-disable-next-line no-console
    console.log(formatRow({ id, averageNs, runsDone: i - 1 })); // ±1.74%

    return averageNs;
  }
}

type RunOpts<T1, T2 = T1, R = void> = {
  before: () => PromiseOptional<T1>;
  beforeEach?: (arg: T1, i: number) => PromiseOptional<T2>;
  run: (input: T2) => PromiseOptional<R>;
  check?: (result: R) => boolean;
  runs?: number;
  maxMs?: number;
  id: string;
};

function averageBigint(arr: bigint[]): bigint {
  const total = arr.reduce((total, value) => total + value);
  return total / BigInt(arr.length);
}

function formatRow({
  id,
  averageNs,
  runsDone,
}: {
  id: string;
  averageNs: number;
  runsDone: number;
}): string {
  const precision = 7;
  const idLen = 64;

  const opsPerSec = 1e9 / averageNs;

  // ================================================================================================================
  // Scalar multiplication G1 (255-bit, constant-time)                              7219.330 ops/s       138517 ns/op
  // Scalar multiplication G2 (255-bit, constant-time)                              3133.117 ops/s       319171 ns/op

  let row = [
    `${opsPerSec.toPrecision(precision).padStart(13)} ops/s`,
    `${averageNs.toPrecision(precision).padStart(13)} ns/op`,
    `${String(runsDone).padStart(6)} runs`,
  ].join(" ");

  return id.slice(0, idLen).padEnd(idLen) + " " + row;
}

export function printTitle(title: string) {
  console.log(`${title}\n${"=".repeat(64)}`);
}
