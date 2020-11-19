import { Blst } from "./types";
import { getBinaryPath } from "./scripts/paths";

export let blst: Blst = new Proxy({} as Blst, {
  get: function () {
    throw Error("BLST binding not initialized, call init() before");
  },
});

export function init() {
  blst = require(getBinaryPath());
}
