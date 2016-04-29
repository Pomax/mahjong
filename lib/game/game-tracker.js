var Constants = require('./constants');

var Stats = {
  PLAYERS: [ 1, 2, 4, 8],
  CONCEALED: 16,
  DISCARDED: false
};

var GameTracker = function() {
  this.tiles = [];
  for (var i=0; i<Constants.BONUS; i++) {
    this.tiles.push(4);
  }
};

GameTracker.prototype = {
  // a player got tiles.length tiles
  playerStart(position, tiles) {
    //...
  },

  // this player gained a known tile
  gained(position, tile) {
    // we know the number of available tiles has gone down
    if (tile < this.tiles.length) {
      this.tiles[tile]--;
    }
  },

  // a player discard a tile, but it might get claimed
  discarded(position, tile) {
    //...
  },

  // this discard is final, no one is getting this tile.
  fullyDiscarded(tile) {
    // we know the number of available tiles has gone down
    this.tiles[tile]--;
  },

  // a player received bonus files for the following known bonus tiles:
  receivedBonus(position, tiles) {
    //...
  },

  // another player, not us, claimed a known tile.
  claimed(position, tile, claimType) {
    //...
  },

  // another player, not us, has revealed the following tiles as being out of the game now
  revealed(position, revealed, concealed) {
    revealed.forEach(tile => this.tiles[tile]--);
  },

  // what is the probability of getting the following tile, given our tile knowledge
  getProbability(tile) {
    var curTotal = this.tiles.reduce((a,b) => a + b, 0);
    var available = this.tiles[tile];
    if (!available) return 0;
    return available/curTotal;
  }
};

module.exports = GameTracker;
