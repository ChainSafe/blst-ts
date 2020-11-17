const fs = require("fs");
const path = require("path");
const defaultBinaryDir = path.join(__dirname, "..", "build");

/**
 * Get binary name.
 * name: {platform}-{arch}-{v8 version}.node
 */
module.exports.getBinaryName = function getBinaryName() {
  const platform = process.platform;
  const variant = getPlatformVariant();
  const arch = process.arch;
  const nodeV8CppApiVersion = process.versions.modules;

  return [
    variant ? `${platform}_${variant}` : platform,
    arch,
    nodeV8CppApiVersion,
    "binding.node",
  ].join("-");
};

module.exports.getBinaryPath = function getBinaryPath() {
  return path.join(defaultBinaryDir, module.exports.getBinaryName());
};

module.exports.mkdirBinary = function mkdirBinary() {
  if (!fs.existsSync(defaultBinaryDir)) {
    fs.mkdirSync(defaultBinaryDir);
  }
};

/**
 * Gets the platform variant, currently either an empty string or 'musl' for Linux/musl platforms.
 */
function getPlatformVariant() {
  var contents = "";

  if (process.platform !== "linux") {
    return "";
  }

  try {
    contents = fs.readFileSync(process.execPath);

    if (contents.indexOf("libc.musl-x86_64.so.1") !== -1) {
      return "musl";
    }
  } catch (err) {} // eslint-disable-line no-empty

  return "";
}
