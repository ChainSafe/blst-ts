/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-call */
const bindings = require("bindings")("blst_ts_addon");

bindings.verify = async function verify(msg, pk, sig) {
  return bindings.aggregateVerify([msg], [pk], sig);
};

bindings.fastAggregateVerify = async function fastAggregateVerify(msg, pks, sig) {
  return bindings.aggregateVerify([msg], [bindings.aggregatePublicKeys(pks)], sig);
};

bindings.CoordType = {
  affine: 0,
  jacobian: 1,
};

module.exports = exports = bindings;
