type PromiseOptional<T> = T | Promise<T>;

export async function runBenchmark<T1, T2 = T1, R = void>({
  before,
  beforeEach,
  run,
  check,
  runs = 512,
  id,
}: {
  before: () => PromiseOptional<T1>;
  beforeEach: (arg: T1, i: number) => PromiseOptional<T2>;
  run: (input: T2) => PromiseOptional<R>;
  check?: (result: R) => boolean;
  runs?: number;
  id: string;
}): Promise<void> {
  const diffsNanoSec: bigint[] = [];

  const inputAll = await before();

  for (let i = 0; i < runs; i++) {
    const input = await beforeEach(inputAll, i);

    const start = process.hrtime.bigint();
    const result = await run(input);
    const end = process.hrtime.bigint();

    if (check && check(result)) throw Error("Result fails check test");

    diffsNanoSec.push(end - start);
  }

  const average = averageBigint(diffsNanoSec);
  const averageNs = Number(average);
  // eslint-disable-next-line no-console
  console.log(formatRow({ id, averageNs })); // ±1.74%
}

function averageBigint(arr: bigint[]): bigint {
  const total = arr.reduce((total, value) => total + value);
  return total / BigInt(arr.length);
}

function formatRow({
  id,
  averageNs,
}: {
  id: string;
  averageNs: number;
}): string {
  const precision = 7;
  const numLen = 13;
  const idMaxLen = 64;

  const opsPerSec = 1e9 / averageNs;

  // ================================================================================================================
  // Scalar multiplication G1 (255-bit, constant-time)                              7219.330 ops/s       138517 ns/op
  // Scalar multiplication G2 (255-bit, constant-time)                              3133.117 ops/s       319171 ns/op

  let row = [
    `${opsPerSec.toPrecision(precision).padStart(numLen)} ops/s`,
    `${averageNs.toPrecision(precision).padStart(numLen)} ns/op`,
  ].join(" ");

  const idLen = Math.min(process.stdout.columns - row.length - 1, idMaxLen);

  return id.slice(0, idLen).padEnd(idLen) + " " + row;
}
