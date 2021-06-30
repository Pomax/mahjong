import { random } from "./math.js";

/**
 * Creates a pseudo-random value generator. The seed must be an integer.
 *
 * Uses an optimized version of the Park-Miller PRNG.
 * http://www.firstpr.com.au/dsp/rand31/
 *
 *
 * See https://gist.github.com/blixt/f17b47c62508be59987b
 */

 /**
  * Changes: if no seed (or seed=0) is provided, use a random seed.
  */
function Random(seed) {
  this._seed = seed ? seed % 2147483647 : random(2147483647);
  console.log(`using initial random seed ${this._seed}`);
  if (this._seed <= 0) this._seed += 2147483646;
}

// custom addition because we need a way to know how to seed very exactly.
Random.prototype.seed = function (v) {
  if (v) this._seed = v;
  return this._seed;
}

let rollCount = 0;

/**
 * Returns a pseudo-random value between 1 and 2^32 - 2.
 */
Random.prototype.next = function () {
  rollCount++;
  return this.seed(this._seed * 16807 % 2147483647);
};

/**
 * Returns a pseudo-random floating point number in range [0, 1).
 */
Random.prototype.nextFloat = function (opt_minOrMax, opt_max) {
  // We know that result of next() will be 1 to 2147483646 (inclusive).
  return (this.next() - 1) / 2147483646;
};

export { Random };
