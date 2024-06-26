import os from "os";
let defaultPoolSize: number;

try {
  if (typeof navigator !== "undefined") {
    defaultPoolSize = navigator.hardwareConcurrency ?? 4;
  } else {
    defaultPoolSize = os.availableParallelism();
  }
} catch (e) {
  defaultPoolSize = 8;
}

/**
 * Cross-platform aprox number of logical cores
 */
export {defaultPoolSize};
