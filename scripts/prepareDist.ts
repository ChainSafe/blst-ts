import {resolve} from "node:path";
import {existsSync, renameSync, cpSync, readFileSync, writeFileSync} from "node:fs";

const TYPES = resolve(__dirname, "..", "lib", "index.d.ts");
const DIST = resolve(__dirname, "..", "dist");
const ESM_DIST = resolve(DIST, "esm");
const CJS_DIST = resolve(DIST, "cjs");

(function prepareDist(): void {
  if (!existsSync(DIST)) {
    throw new Error("run yarn build:ts to build dist");
  }
  if (!existsSync(ESM_DIST)) {
    throw new Error("run yarn build:ts:esm to build dist/esm");
  }
  if (!existsSync(CJS_DIST)) {
    throw new Error("run yarn build:ts to build dist/cjs");
  }

  cpSync(TYPES, resolve(ESM_DIST, "lib", "index.d.mts"));
  cpSync(TYPES, resolve(CJS_DIST, "lib", "index.d.cts"));

  let cjsIndex = resolve(CJS_DIST, "lib", "index.js");
  const newCjsIndex = resolve(CJS_DIST, "lib", "index.cjs");
  if (existsSync(cjsIndex)) {
    renameSync(cjsIndex, newCjsIndex);
  }
  cjsIndex = newCjsIndex;
  const cjsIndexData = readFileSync(cjsIndex, "utf8").replace("index.js.map", "index.cjs.map");
  writeFileSync(cjsIndex, cjsIndexData);

  let cjsMapFile = resolve(CJS_DIST, "lib", "index.js.map");
  const newCjsMapFile = resolve(CJS_DIST, "lib", "index.cjs.map");
  if (existsSync(cjsMapFile)) {
    renameSync(cjsMapFile, newCjsMapFile);
  }
  cjsMapFile = newCjsMapFile;
  const mapFileData = readFileSync(cjsMapFile, "utf8").replace(/index.js/gi, "index.cjs");
  writeFileSync(cjsMapFile, mapFileData);

  writeFileSync(resolve(CJS_DIST, "package.json"), JSON.stringify({type: "commonjs"}));
  writeFileSync(resolve(ESM_DIST, "package.json"), JSON.stringify({type: "module"}));
})();
