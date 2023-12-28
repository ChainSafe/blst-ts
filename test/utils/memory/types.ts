export interface RegressionResults {
  slope: number;
  yIntercept: number;
}

export type UsageComputation = (memoryUsage: NodeJS.MemoryUsage) => number;

export type GetInstanceFunction<T> = () => T;

export interface MemoryUsage extends NodeJS.MemoryUsage {
  computed: number;
}

export interface MemoryTestResult {
  averageBytesPerInstance: number;
  instancesCreated: number;
  totalMemoryAllocated: number;
  numberOfSamples: number;
}

export type MemoryTestOptions<T> = {
  /**
   * Name of the test run
   */
  id: string;

  /**
   * Allocation function for a single instance of the object to be tested
   */
  getInstance: GetInstanceFunction<T>;

  /**
   * How to compute the total memory usage. Defaults to
   * `heapUsed + external + arrayBuffers`
   */
  computeUsedMemory?: UsageComputation;

  /**
   *
   */
  rounds?: number;

  /**
   *
   */
  instancesPerRound?: number;

  /**
   * Sample memory usage every `sampleEvery` instances balancing detail against
   * overhead. Optimal value depends on the object's memory footprint and test scope
   */
  sampleEvery?: number;

  /**
   * Stop if `process.memoryUsage().rss > maxRssBytes`.
   */
  maxRssBytes?: number;

  /**
   * Stop if `process.memoryUsage().heapTotal > maxHeapBytes`.
   */
  maxHeapBytes?: number;

  /**
   * Stop after creating `maxInstances` instances.
   */
  maxInstances?: number;

  /**
   *
   */
  displayRunInfo?: boolean;

  /**
   *
   */
  convergeFactor?: number;

  /**
   * Number of instances to create and garbage collect before
   * starting measurement
   */
  warmUpIterations?: number;

  /**
   * Optional delay, in milliseconds, for garbage collection to be run
   * for the second time
   */
  gcDelay?: number;
};

/**
 * Used for linear regression calculation. MemoryAtInstance[0] is the instance
 * count and MemoryAtInstance[1] is the memory usage at that instance count.
 */
export type MemoryAtInstance = [number, number];
export type MemoryUsageResults = MemoryAtInstance[];
