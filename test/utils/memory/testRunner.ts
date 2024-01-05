import {MemoryAtInstance, MemoryTestOptions, MemoryTestResult, MemoryUsageResults, RegressionResults} from "./types";

/**
 * From https://github.com/simple-statistics/simple-statistics/blob/d0d177baf74976a2421638bce98ab028c5afb537/src/linear_regression.js
 *
 * [Simple linear regression](http://en.wikipedia.org/wiki/Simple_linear_regression)
 * is a simple way to find a fitted line between a set of coordinates.
 * This algorithm finds the slope and y-intercept of a regression line
 * using the least sum of squares.
 *
 * @param data an array of two-element of arrays,
 * like `[[0, 1], [2, 3]]`
 * @returns object containing slope and intersect of regression line
 * @example
 * linearRegression([[0, 0], [1, 1]]); // => { slope: 1, yIntercept: 0 }
 */
function linearRegression(coordinates: MemoryUsageResults): RegressionResults {
  // Store data length in a local variable to reduce
  // repeated object property lookups
  const dataLength = coordinates.length;

  //if there's only one point, arbitrarily choose a slope of 0
  //and a y-intercept of whatever the y of the initial point is
  if (dataLength === 1) {
    return {
      slope: 0,
      yIntercept: coordinates[0][1],
    };
  }

  // Initialize our sums and scope the `slope` and `yIntercept`
  // variables that define the line.
  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumXY = 0;

  // Gather the sum of all x values, the sum of all
  // y values, and the sum of x^2 and (x*y) for each
  // value.
  //
  // In math notation, these would be SS_x, SS_y, SS_xx, and SS_xy
  for (let i = 0; i < dataLength; i++) {
    const [x, y] = coordinates[i];
    sumX += x;
    sumY += y;
    sumXX += x * x;
    sumXY += x * y;
  }

  const slope = (dataLength * sumXY - sumX * sumY) / (dataLength * sumXX - sumX * sumX);
  const yIntercept = sumY / dataLength - (slope * sumX) / dataLength;

  return {
    slope,
    yIntercept,
  };
}

/**
 * Run the garbage collector twice. Optionally can add a delay to allow
 * other promise resolution to occur before the second run of the GC
 *
 * @param gcDelay - Optional delay, in milliseconds, before 2nd run of GC
 */
async function runGarbageCollector(gcDelay = 100): Promise<void> {
  global.gc?.();
  if (gcDelay && gcDelay !== 0) {
    await new Promise((r) => setTimeout(r, gcDelay));
  }
  global.gc?.();
}

const MAX_SAMPLES = 10000;
/**
 * When is a good time to stop the benchmark? A naive answer is after N
 * milliseconds or M runs. This code aims to stop the benchmark when the average
 * memory growth has converged at a value within a given convergence factor. It
 * stores two past values to be able to compute a very rough linear and
 * quadratic convergence.
 *
 * Gets total memory usage allocated by isolate. Can only account for usage the
 * isolate knows about and does not take into account RSS. Runs garbage collector
 * and waits for several manual passes to ensure all temporary objects are
 * collected before size is estimated.
 */
async function memoryTestRunner<T>({
  gcDelay = 100,
  sampleEvery = 1000,
  warmUpIterations = 100,
  maxInstances = Infinity,
  convergeFactor = 0.2 / 100, // 0.2%
  maxRssBytes,
  maxHeapBytes,
  getInstance,
  computeUsedMemory = (usage) => usage.heapUsed + usage.external + usage.arrayBuffers,
}: MemoryTestOptions<T>): Promise<MemoryTestResult> {
  // Array to store references to created instances (to prevent garbage collection)
  const refs: T[] = [];

  // Pre-Allocate array to store memory data at each sample point
  const memoryData: MemoryAtInstance[] = new Array(MAX_SAMPLES);
  for (let k = 0; k < MAX_SAMPLES; k++) {
    memoryData[k] = [0, 0, 0];
  }

  // Preallocations to not skew memory usage
  let sampleIndex = 0;
  let i = 0;

  // Previous slope values for convergence calculation (2 prior and prior to current)
  let prevM0 = 0;
  let prevM1 = 0;

  // Warm-up phase to stabilize Isolate and testing framework memory usage
  for (let j = 0; j < warmUpIterations; j++) {
    getInstance();
  }
  await runGarbageCollector(gcDelay);
  let memoryUsage = process.memoryUsage();
  const startingUsage = computeUsedMemory(memoryUsage);
  const startingRss = memoryUsage.rss;

  // All variable beyond here must be pre-allocated or temporary to not affect
  // results
  loop: for (i = 0; i < maxInstances; i++) {
    refs.push(getInstance());

    if (i % sampleEvery === 0) {
      await runGarbageCollector(gcDelay);
      memoryUsage = process.memoryUsage();
      // do not create new tuple array, just reset inner tuple values
      memoryData[sampleIndex][0] = i;
      memoryData[sampleIndex][1] = computeUsedMemory(memoryUsage);
      memoryData[sampleIndex][2] = memoryUsage.rss;
      sampleIndex++;

      if (
        sampleIndex >= MAX_SAMPLES ||
        (maxRssBytes && memoryUsage.rss > maxRssBytes) ||
        (maxHeapBytes && memoryUsage.heapTotal > maxHeapBytes)
      ) {
        break loop;
      }

      if (memoryData.length > 1) {
        const {slope} = linearRegression(memoryData.slice(0, sampleIndex));

        // Compute convergence (1st order + 2nd order)
        const a = prevM0;
        const b = prevM1;
        const c = slope;

        /**
         * Approx linear convergence: Absolute difference between the current
         * and previous-to-previous slope. It measures how much the slope is
         * changing in a linear fashion.
         */
        const convergenceLinear = Math.abs(c - a);

        /**
         * Approx quadratic convergence: Absolute difference between the
         * previous slope and the average of current and previous-to-previous
         * slopes. It gives an indication of the curvature or the rate of change
         * of the  slope itself.
         */
        const convergenceQuadratic = Math.abs(b - (a + c) / 2);

        /**
         * Take the greater of both to ensure both linear and quadratic
         * convergence are below the convergeFactor
         */
        const convergence = Math.max(convergenceLinear, convergenceQuadratic) / a;

        /**
         * Stop the benchmark if the rate of change of memory usage has
         * stabilized sufficiently
         */
        if (convergence < convergeFactor) {
          break loop;
        }

        prevM0 = prevM1;
        prevM1 = slope;
      }
    }
  }

  const numberOfSamples = sampleIndex - 1;
  const [instancesCreated, endingUsage, endingRss] = memoryData[numberOfSamples];

  return {
    averageBytesPerInstance: linearRegression(memoryData.slice(0, sampleIndex)).slope,
    numberOfSamples,
    instancesCreated,
    totalMemoryAllocated: endingUsage - startingUsage,
    rssAllocated: endingRss - startingRss,
  };
}

function stringifyResultByOrderOfMagnitude(bytes: number): string {
  let val = bytes / 1e9;
  if (val > 1) return `${val.toFixed(2)} gb`;
  val = bytes / 1e6;
  if (val > 1) return `${val.toFixed(2)} mb`;
  val = bytes / 1e3;
  if (val > 1) return `${val.toFixed(2)} kb`;
  return `${Math.ceil(bytes)}  b`;
}

function formatRunResult(test: MemoryTestOptions<unknown>, result: MemoryTestResult, titlePadding?: number): string {
  const title = titlePadding ? test.id.padEnd(titlePadding) : test.id;
  const segments = [title, `${stringifyResultByOrderOfMagnitude(result.averageBytesPerInstance)} / instance`];
  if (test.displayRunInfo) {
    segments.push(`${result.totalMemoryAllocated} allocated by ${result.instancesCreated} instances`);
  }
  return segments.join(" - ");
}

export async function memoryTest(
  testCases: MemoryTestOptions<unknown>[],
  options?: Partial<MemoryTestOptions<unknown>>
): Promise<void> {
  if (global.gc === undefined) {
    throw Error("Must enable global.gc with --expose-gc flag when starting node");
  }
  const longestId = Math.max(...testCases.map(({id}) => id.length));

  for (const testRun of testCases) {
    const result = await memoryTestRunner({...options, ...testRun});
    // eslint-disable-next-line no-console
    console.log(formatRunResult(testRun, result, longestId));
  }
}
