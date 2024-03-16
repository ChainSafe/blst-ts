/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
const bindings = require("bindings")("blst_ts_addon");
const crypto = require("crypto");

bindings.SecretKey.prototype.toHex = function () {
  return `0x${this.serialize().toString("hex")}`;
};

bindings.PublicKey.prototype.toHex = function (compress) {
  return `0x${this.serialize(compress).toString("hex")}`;
};

bindings.Signature.prototype.toHex = function (compress) {
  return `0x${this.serialize(compress).toString("hex")}`;
};

function verify(msg, pk, sig) {
  return bindings.aggregateVerify([msg], [pk], sig);
}

function asyncVerify(msg, pk, sig) {
  return bindings.asyncAggregateVerify([msg], [pk], sig);
}

function fastAggregateVerify(msg, pks, sig) {
  let key;
  try {
    // this throws for invalid key, catch and return false
    key = bindings.aggregatePublicKeys(pks);
  } catch {
    return false;
  }
  return bindings.aggregateVerify([msg], [key], sig);
}

function asyncFastAggregateVerify(msg, pks, sig) {
  let key;
  try {
    // this throws for invalid key, catch and return false
    key = bindings.aggregatePublicKeys(pks);
  } catch {
    return false;
  }
  return bindings.asyncAggregateVerify([msg], [key], sig);
}

const CoordType = {
  affine: 0,
  jacobian: 1,
};

/**
 * `rand` must not be exactly zero. Otherwise it would allow the verification of invalid signatures
 * See https://github.com/ChainSafe/blst-ts/issues/45
 */
function randomBytesNonZero(bytesCount) {
  const rand = crypto.randomBytes(bytesCount);
  for (let i = 0; i < bytesCount; i++) {
    if (rand[i] !== 0) return rand;
  }
  rand[0] = 1;
  return rand;
}

module.exports = {
  ...bindings,
  CoordType,
  randomBytesNonZero,
  verify,
  asyncVerify,
  fastAggregateVerify,
  asyncFastAggregateVerify,
};
