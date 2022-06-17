import path from "path";

export const ROOT_DIR = path.join(__dirname, "../..");
export const PREBUILD_DIR = path.join(ROOT_DIR, "prebuild", "swig");
export const PACKAGE_JSON_PATH = path.join(ROOT_DIR, "package.json");
export const BINDINGS_DIR = path.join(ROOT_DIR, "blst", "bindings", "node.js");

// Paths for blst_wrap.cpp
// Resolve path to absolute since it will be used from a different working dir
// when running blst_wrap.py
export const BLST_WRAP_CPP_PREBUILD = path.resolve(ROOT_DIR, "prebuild", "swig", "blst_wrap.cpp");
