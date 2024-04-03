import {resolve} from "node:path";
import {existsSync} from "node:fs";
import {exec as EXEC, ExecOptions, ChildProcess, PromiseWithChild} from "node:child_process";
import {BlstTs, BlstTsAddon, CoordType} from "./types.js";
import {randomBytes} from "node:crypto";

export const BINDINGS_NAME = "blst_ts_addon";
export const BINDINGS_FILE = `${BINDINGS_NAME}.node`;

class NotNodeJsError extends Error {
  constructor(missingItem: string) {
    super(`blst-ts bindings only run in a NodeJS context. No ${missingItem} found.`);
  }
}

/**
 * Get binary name.
 * name: {platform}-{arch}-{v8 version}-blst_ts_addon.node
 */
export function getBinaryName(): string {
  if (!process) throw new NotNodeJsError("global object");
  const platform = process.platform;
  if (!platform) throw new NotNodeJsError("process.platform");
  const arch = process.arch;
  if (!arch) throw new NotNodeJsError("process.arch");
  const nodeApiVersion = process.versions.modules;
  if (!nodeApiVersion) throw new NotNodeJsError("process.versions.modules");

  return [platform, arch, nodeApiVersion, BINDINGS_FILE].join("-");
}

/**
 * Builds a list of search paths to look for the bindings file
 */
function buildSearchPaths(rootDir: string, filename: string): string[] {
  const searchLocations: string[][] = [
    [rootDir],
    [rootDir, "prebuild"],
    [rootDir, "build"],
    [rootDir, "build", "Debug"],
    [rootDir, "build", "Release"],
  ];

  return searchLocations.map((location) => resolve(...location, filename));
}

/**
 * Locates the bindings file using the blst-ts naming convention for prebuilt
 * bindings. Falls back to node-gyp naming if not found.
 */
export function getBindingsPath(rootDir: string): string {
  const names = [getBinaryName(), BINDINGS_FILE];
  const searchLocations = names.map((name) => buildSearchPaths(rootDir, name)).flat();
  for (const filepath of searchLocations) {
    if (existsSync(filepath)) {
      return filepath;
    }
  }

  throw Error(`Could not find bindings file. Tried:\n${searchLocations.join("\n")}`);
}

export interface ExecPromiseOptions extends ExecOptions {
  pipeInput?: boolean;
}

const defaultOptions: ExecPromiseOptions = {
  timeout: 3 * 60 * 1000, // ms
  maxBuffer: 10e6, // bytes
  pipeInput: false,
};

export function exec(
  command: string,
  logToConsole = true,
  execOptions: ExecPromiseOptions = {}
): PromiseWithChild<string> {
  const options = {...defaultOptions, ...execOptions};

  let child!: ChildProcess;
  const promise = new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    function bufferOutput(data: string): void {
      chunks.push(Buffer.from(data));
    }
    function stdoutHandler(data: string): void {
      process.stdout.write(data);
    }
    function stderrHandler(data: string): void {
      process.stderr.write(data);
    }

    child = EXEC(command, options, (err) => {
      child.stdout?.removeAllListeners("data");
      child.stderr?.removeAllListeners("data");
      const output = Buffer.concat(chunks).toString("utf8");
      if (err) {
        return reject(err);
      }
      return resolve(output);
    });

    if (child.stdin && options.pipeInput) {
      process.stdin.pipe(child.stdin);
    }
    child.stdout?.on("data", logToConsole ? stdoutHandler : bufferOutput);
    child.stderr?.on("data", logToConsole ? stderrHandler : bufferOutput);

    child.on("exit", () => {
      return resolve(Buffer.concat(chunks).toString("utf8"));
    });
  }) as PromiseWithChild<string>;

  promise.child = child;
  return promise;
}

export function prepareBindings(bindings: BlstTsAddon): BlstTs {
  bindings.SecretKey.prototype.toHex = function () {
    return `0x${this.serialize().toString("hex")}`;
  };

  bindings.PublicKey.prototype.toHex = function (compress) {
    return `0x${this.serialize(compress).toString("hex")}`;
  };

  bindings.Signature.prototype.toHex = function (compress) {
    return `0x${this.serialize(compress).toString("hex")}`;
  };

  return {
    ...bindings,
    CoordType,
    randomBytesNonZero(bytesCount) {
      const rand = randomBytes(bytesCount);
      for (let i = 0; i < bytesCount; i++) {
        if (rand[i] !== 0) return rand;
      }
      rand[0] = 1;
      return rand;
    },
    verify(message, publicKey, signature) {
      return bindings.aggregateVerify([message], [publicKey], signature);
    },
    asyncVerify(message, publicKey, signature) {
      return bindings.asyncAggregateVerify([message], [publicKey], signature);
    },
    fastAggregateVerify(message, publicKeys, signature) {
      let key;
      try {
        // this throws for invalid key, catch and return false
        key = bindings.aggregatePublicKeys(publicKeys);
      } catch {
        return false;
      }
      return bindings.aggregateVerify([message], [key], signature);
    },
    asyncFastAggregateVerify(message, publicKeys, signature) {
      let key;
      try {
        // this throws for invalid key, catch and return false
        key = bindings.aggregatePublicKeys(publicKeys);
      } catch {
        return Promise.resolve(false);
      }
      return bindings.asyncAggregateVerify([message], [key], signature);
    },
  };
}