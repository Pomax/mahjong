'use strict'

var strategies = {
  /**
   * Simply cycle through tiles.
   *
   * Odds of winning:
   *
   * - mixed:
   * - pung only: roughly 2 out of a 100 hands = 0.02%
   */
  fifo: function(tiles, tracker) {
    return tiles[0];
  },

  /**
   * Simply cycle through tiles, just in a different way.
   *
   * Odds of winning
   *
   * - mixed:
   * - pung only: roughly 2 out of a 100 hands = 0.02%
   */
  random: function(tiles, tracker) {
    var pos = (tiles.length * Math.random()) | 0;
    return tiles[pos];
  },

  /**
   * Throw out singles, unless there are no singles left,
   * then throw out something at random.
   *
   * Odds of winning:
   *
   * mixed:
   * pung only: roughly 127 out of a 352 hands = 36%
   *
   */
  punghand: function(tiles, tracker) {
    var reduced = {};
    tiles.forEach(t => { if (!reduced[t]) reduced[t] = 0; reduced[t]++; });
    reduced = Object.keys(reduced).filter(t => reduced[t]===1);
    // make sure we discard _something_ even if we have no singles:
    if (reduced.length === 0) { reduced = tiles; }
    var pos = (reduced.length * Math.random())|0;
    return reduced[pos];
  },
};

module.exports = {
  getStrategy: function(name) {
    return strategies[name];
  },

  getRandomStrategy: function() {
    var strats = Object.keys(strategies);
    var pos = strats.length * Math.random();
    return strategies[strats[pos]];
  }
};
