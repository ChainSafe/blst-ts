/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-call */
const bindings = require("bindings")("blst_ts_addon");

bindings.CoordType = {
  affine: 0,
  jacobian: 1,
};

module.exports = exports = bindings;
