var logger = require('../../logger');
var Constants = require('../../constants');
var Tiles = require('../tiles');

var FSA = function() {
  this.log = logger("fsa");
}

FSA.prototype = {
  check(tiles, pair, sets) {
    this.log("checking",tiles,pair,sets);
    if (!pair && !sets) {
      if (tiles.length) {
        this.log("this was not a winning pattern.");
        return false;
      }
      this.log("this is a winning pattern.");
      return true;
    }

    var success;
    var tile = tiles.splice(0,1)[0];

    // try this tile as a pair
    if (pair===1) {
      success = this.tryPair(tile, tiles.slice(), pair, sets);
      if (success) return true;
    }

    // try this tile as 1/2/3 chows
    if (Tiles.isNumeral(tile)) {
      success = this.tryChow(tile, tiles.slice(), pair, sets);
      if (success) return true;
    }

    // try this tile as a pung
    success = this.tryPung(tile, tiles.slice(), pair, sets);
    if (success) return true;

    return false;
  },

  tryPair(tile, tiles, pair, sets) {
    // remove duplicate
    var pos = tiles.indexOf(tile);
    if(pos === -1) return false;
    tiles.splice(pos,1);

    // recurse
    this.log("pair",tile,"worked");
    return this.check(tiles, pair-1, sets);
  },

  tryChow(tile, tiles, pair, sets) {
    var success;
    var position = tile % Constants.NUMMOD;
    // end positions
    if (position===0) {
      success = this.tryChow1(tile, tiles.slice(), pair, sets);
      if (success) return true;
    }
    else if (position===Constants.NUMMOD) {
      success = this.tryChow3(tile, tiles.slice(), pair, sets);
      if (success) return true;
    }
    // single-to-end positions
    else if (position===1) {
      success = this.tryChow1(tile, tiles.slice(), pair, sets);
      if (success) return true;
      success = this.tryChow2(tile, tiles.slice(), pair, sets);
      if (success) return true;
    }
    else if (position===Constants.NUMMOD-1) {
      success = this.tryChow2(tile, tiles.slice(), pair, sets);
      if (success) return true;
      success = this.tryChow3(tile, tiles.slice(), pair, sets);
      if (success) return true;
    }
    // the rest
    else {
      success = this.tryChow1(tile, tiles.slice(), pair, sets);
      if (success) return true;
      success = this.tryChow2(tile, tiles.slice(), pair, sets);
      if (success) return true;
      success = this.tryChow3(tile, tiles.slice(), pair, sets);
      if (success) return true;
    }

    // FIXME: TODO: This can be cleaned up, but the current code follows
    //              the "make it work, then clean it up" methodology.

    return false;
  },

  tryChow1(tile, tiles, pair, sets) {
    var t1 = tile + 1,
        t2 = tile + 2;
    return this.tryChowX(tile, t1, t2, tiles, pair, sets);
  },

  tryChow2(tile, tiles, pair, sets) {
    var t1 = tile - 1,
        t2 = tile + 1;
    return this.tryChowX(tile, t1, t2, tiles, pair, sets);
  },

  tryChow3(tile, tiles, pair, sets) {
    var t1 = tile - 2,
        t2 = tile - 1;
    return this.tryChowX(tile, t1, t2, tiles, pair, sets);
  },

  tryChowX(tile, t1, t2, tiles, pair, sets) {
    // remove first tile
    var pos = tiles.indexOf(t1);
    if(pos === -1) return false;
    tiles.splice(pos,1);

    // remove second tile
    pos = tiles.indexOf(t2);
    if(pos === -1) return false;
    tiles.splice(pos,1);

    // recurse
    this.log("chow",tile,t1,t2,"worked");
    return this.check(tiles, pair, sets-1);
  },

  tryPung(tile, tiles, pair, sets) {
    // remove first duplicate
    var pos = tiles.indexOf(tile);
    if(pos === -1) return false;
    tiles.splice(pos,1);

    // remove second duplicate
    pos = tiles.indexOf(tile);
    if(pos === -1) return false;
    tiles.splice(pos,1);

    // recurse
    this.log("pung",tile,"worked");
    return this.check(tiles, pair, sets-1);
  }
};

module.exports = new FSA();
