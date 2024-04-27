"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exec = exports.getBindingsPath = exports.getBinaryName = exports.BINDINGS_FILE = exports.BINDINGS_NAME = void 0;
const node_path_1 = require("node:path");
const node_fs_1 = require("node:fs");
const node_child_process_1 = require("node:child_process");
exports.BINDINGS_NAME = "blst_ts_addon";
exports.BINDINGS_FILE = `${exports.BINDINGS_NAME}.node`;
class NotNodeJsError extends Error {
    constructor(missingItem) {
        super(`blst-ts bindings only run in a NodeJS context. No ${missingItem} found.`);
    }
}
/**
 * Get binary name.
 * name: {platform}-{arch}-{v8 version}-blst_ts_addon.node
 */
function getBinaryName() {
    if (!process)
        throw new NotNodeJsError("global object");
    const platform = process.platform;
    if (!platform)
        throw new NotNodeJsError("process.platform");
    const arch = process.arch;
    if (!arch)
        throw new NotNodeJsError("process.arch");
    const nodeApiVersion = process.versions.modules;
    if (!nodeApiVersion)
        throw new NotNodeJsError("process.versions.modules");
    return [platform, arch, nodeApiVersion, exports.BINDINGS_FILE].join("-");
}
exports.getBinaryName = getBinaryName;
/**
 * Builds a list of search paths to look for the bindings file
 */
function buildSearchPaths(rootDir) {
    const searchLocations = [
        [rootDir, "prebuild", getBinaryName()],
        [rootDir, "build", "Debug", exports.BINDINGS_FILE],
        [rootDir, "build", "Release", exports.BINDINGS_FILE],
    ];
    return searchLocations.map((location) => (0, node_path_1.resolve)(...location));
}
/**
 * Locates the bindings file using the blst-ts naming convention for prebuilt
 * bindings. Falls back to node-gyp naming if not found.
 */
function getBindingsPath(rootDir) {
    const searchLocations = buildSearchPaths(rootDir);
    for (const filepath of searchLocations) {
        if ((0, node_fs_1.existsSync)(filepath)) {
            return filepath;
        }
    }
    throw Error(`Could not find bindings file. Tried:\n${searchLocations.join("\n")}`);
}
exports.getBindingsPath = getBindingsPath;
const defaultOptions = {
    timeout: 3 * 60 * 1000, // ms
    maxBuffer: 10e6, // bytes
    pipeInput: false,
};
function exec(command, logToConsole = true, execOptions = {}) {
    const options = { ...defaultOptions, ...execOptions };
    let child;
    const promise = new Promise((resolve, reject) => {
        const chunks = [];
        function bufferOutput(data) {
            chunks.push(Buffer.from(data));
        }
        function stdoutHandler(data) {
            process.stdout.write(data);
        }
        function stderrHandler(data) {
            process.stderr.write(data);
        }
        child = (0, node_child_process_1.exec)(command, options, (err) => {
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
    });
    promise.child = child;
    return promise;
}
exports.exec = exec;
//# sourceMappingURL=index.js.map