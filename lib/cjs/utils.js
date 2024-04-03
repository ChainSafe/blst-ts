"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareBindings = exports.exec = exports.getBindingsPath = exports.getBinaryName = exports.BINDINGS_FILE = exports.BINDINGS_NAME = void 0;
const node_path_1 = require("node:path");
const node_fs_1 = require("node:fs");
const node_child_process_1 = require("node:child_process");
const types_js_1 = require("./types.js");
const node_crypto_1 = require("node:crypto");
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
function buildSearchPaths(rootDir, filename) {
    const searchLocations = [
        [rootDir],
        [rootDir, "prebuild"],
        [rootDir, "build"],
        [rootDir, "build", "Debug"],
        [rootDir, "build", "Release"],
    ];
    return searchLocations.map((location) => (0, node_path_1.resolve)(...location, filename));
}
/**
 * Locates the bindings file using the blst-ts naming convention for prebuilt
 * bindings. Falls back to node-gyp naming if not found.
 */
function getBindingsPath(rootDir) {
    const names = [getBinaryName(), exports.BINDINGS_FILE];
    const searchLocations = names.map((name) => buildSearchPaths(rootDir, name)).flat();
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
    const options = Object.assign(Object.assign({}, defaultOptions), execOptions);
    let child;
    const promise = new Promise((resolve, reject) => {
        var _a, _b;
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
            var _a, _b;
            (_a = child.stdout) === null || _a === void 0 ? void 0 : _a.removeAllListeners("data");
            (_b = child.stderr) === null || _b === void 0 ? void 0 : _b.removeAllListeners("data");
            const output = Buffer.concat(chunks).toString("utf8");
            if (err) {
                return reject(err);
            }
            return resolve(output);
        });
        if (child.stdin && options.pipeInput) {
            process.stdin.pipe(child.stdin);
        }
        (_a = child.stdout) === null || _a === void 0 ? void 0 : _a.on("data", logToConsole ? stdoutHandler : bufferOutput);
        (_b = child.stderr) === null || _b === void 0 ? void 0 : _b.on("data", logToConsole ? stderrHandler : bufferOutput);
        child.on("exit", () => {
            return resolve(Buffer.concat(chunks).toString("utf8"));
        });
    });
    promise.child = child;
    return promise;
}
exports.exec = exec;
function prepareBindings(bindings) {
    bindings.SecretKey.prototype.toHex = function () {
        return `0x${this.serialize().toString("hex")}`;
    };
    bindings.PublicKey.prototype.toHex = function (compress) {
        return `0x${this.serialize(compress).toString("hex")}`;
    };
    bindings.Signature.prototype.toHex = function (compress) {
        return `0x${this.serialize(compress).toString("hex")}`;
    };
    return Object.assign(Object.assign({}, bindings), { CoordType: types_js_1.CoordType,
        randomBytesNonZero(bytesCount) {
            const rand = (0, node_crypto_1.randomBytes)(bytesCount);
            for (let i = 0; i < bytesCount; i++) {
                if (rand[i] !== 0)
                    return rand;
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
            }
            catch (_a) {
                return false;
            }
            return bindings.aggregateVerify([message], [key], signature);
        },
        asyncFastAggregateVerify(message, publicKeys, signature) {
            let key;
            try {
                // this throws for invalid key, catch and return false
                key = bindings.aggregatePublicKeys(publicKeys);
            }
            catch (_a) {
                return Promise.resolve(false);
            }
            return bindings.asyncAggregateVerify([message], [key], signature);
        } });
}
exports.prepareBindings = prepareBindings;
//# sourceMappingURL=utils.js.map