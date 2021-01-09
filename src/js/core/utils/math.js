// This "you need the Math namespace!" nonsense
// always drives me nuts. We're aliassing these.
let max = Math.max;
let min = Math.min;
let random = v => v ? (Math.random() * v)|0 : Math.random();

if (typeof process !== "undefined") {
  module.exports = { min, max, random };
}
