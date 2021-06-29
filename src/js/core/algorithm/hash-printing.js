import { Constants } from "../../../config.js";

/**
 * hash a tile requirement object to a compact string form.
 */
function hash(set) {
  let s = `${set.type}`;
  if (set.subtype) { s = `${s}s${set.subtype}`; }
  if (set.type===Constants.PAIR || set.type===Constants.CHOW) { s = `${s}t${set.tile}`; }
  return s;
}

/**
 * unhash a tile requirement object from its compact string form.
 */
function unhash(print, tile) {
  let re = /(\d+)(s(-?\d+))?(t(\d+))?/;
  let m = print.match(re);
  let type = parseInt(m[1]);
  let subtype = m[3] ? parseInt(m[3]) : undefined;
  let required = tile;
  if (type===Constants.CHOW) tile -= subtype;
  let obj = { required, type, subtype, tile };
  return obj;
}

export { unhash, hash };
