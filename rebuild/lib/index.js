/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-call */
const bindings = require("bindings")("blst_ts_addon");

bindings.verify = async function verify(msg, pk, sig) {
  return bindings.aggregateVerify([msg], [pk], sig);
};
bindings.verifySync = function verifySync(msg, pk, sig) {
  return bindings.aggregateVerifySync([msg], [pk], sig);
};
bindings.fastAggregateVerify = async function fastAggregateVerify(msg, pks, sig) {
  const aggPk = await bindings.aggregatePublicKeys(pks);
  return bindings.aggregateVerify([msg], [aggPk], sig);
};
bindings.fastAggregateVerifySync = function fastAggregateVerifySync(msg, pks, sig) {
  const aggPk = bindings.aggregatePublicKeysSync(pks);
  return bindings.aggregateVerifySync([msg], [aggPk], sig);
};

module.exports = exports = bindings;
