const {module: _module, resolve, ignoreWarnings} = require("./webpack.config");

module.exports = (config) => {
  config.set({
    basePath: "",
    files: [
        "test/unit/lib/index.test.ts",
        "test/unit/bindings/*.test.ts",
    ],
    frameworks: ["webpack", "mocha", "chai"],
    browsers: ["Chrome"],
    plugins: ["karma-chrome-launcher", "karma-webpack", "karma-mocha", "karma-chai"],
    preprocessors: {
      "test/**/*.ts": ["webpack"],
      // "src/**/*.ts": ["webpack"],
    },
    webpack: {
      mode: "production",
      module: _module,
      resolve,
      ignoreWarnings,
    }
  });
}
