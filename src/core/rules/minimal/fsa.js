'use strict';

var Tree = require('arctic-redpoll');
var Constants = require('../../constants');
var Tiles = require('../../tiles');

class FSA {
  constructor() {
    this.debug = false;
  }

  log() {
    if (this.debug)
      console.log.apply(console, arguments);
  }

  /**
   * Check to see if there is *any* winning pattern possible.
   */
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
  }

  /**
   * Generate *all* sets/pairs that can be formed.
   */
  generate(tiles, pair, patterns) {
    patterns = patterns || new Tree();
    var sets = 0;
    var tile = tiles.splice(0,1)[0];
    if (pair===1) { this.tryPair(tile, tiles.slice(), pair, sets, patterns); }
    if (Tiles.isNumeral(tile)) { this.tryChow(tile, tiles.slice(), pair, sets, patterns); }
    this.tryPung(tile, tiles.slice(), pair, sets, patterns);
    this.tryKong(tile, tiles.slice(), pair, sets, patterns);
    return patterns;
  }

  tryPair(tile, tiles, pair, sets, patterns) {
    // remove duplicate
    var pos = tiles.indexOf(tile);
    if(pos === -1) return false;
    tiles.splice(pos,1);

    // recurse
    this.log("pair",tile,"worked");
    if (patterns) {
      return this.generate(tiles, pair-1, patterns.add([tile, tile]));
    }
    return this.check(tiles, pair-1, sets);
  }

  tryChow(tile, tiles, pair, sets, patterns) {
    var success;
    var position = tile % Constants.NUMMOD;
    // end positions
    if (position===0) {
      success = this.tryChow1(tile, tiles.slice(), pair, sets, patterns);
      if (success) return true;
    }
    else if (position===Constants.NUMMOD) {
      success = this.tryChow3(tile, tiles.slice(), pair, sets, patterns);
      if (success) return true;
    }
    // single-to-end positions
    else if (position===1) {
      success = this.tryChow1(tile, tiles.slice(), pair, sets, patterns);
      if (success) return true;
      success = this.tryChow2(tile, tiles.slice(), pair, sets, patterns);
      if (success) return true;
    }
    else if (position===Constants.NUMMOD-1) {
      success = this.tryChow2(tile, tiles.slice(), pair, sets, patterns);
      if (success) return true;
      success = this.tryChow3(tile, tiles.slice(), pair, sets, patterns);
      if (success) return true;
    }
    // the rest
    else {
      success = this.tryChow1(tile, tiles.slice(), pair, sets, patterns);
      if (success) return true;
      success = this.tryChow2(tile, tiles.slice(), pair, sets, patterns);
      if (success) return true;
      success = this.tryChow3(tile, tiles.slice(), pair, sets, patterns);
      if (success) return true;
    }

    // FIXME: TODO: This can be cleaned up, but the current code follows
    //              the "make it work, then clean it up" methodology.
    return false;
  }

  tryChow1(tile, tiles, pair, sets, patterns) {
    var t1 = tile + 1,
        t2 = tile + 2;
    return this.tryChowX(tile, t1, t2, tiles, pair, sets, patterns);
  }

  tryChow2(tile, tiles, pair, sets, patterns) {
    var t1 = tile - 1,
        t2 = tile + 1;
    return this.tryChowX(tile, t1, t2, tiles, pair, sets, patterns);
  }

  tryChow3(tile, tiles, pair, sets, patterns) {
    var t1 = tile - 2,
        t2 = tile - 1;
    return this.tryChowX(tile, t1, t2, tiles, pair, sets, patterns);
  }

  tryChowX(tile, t1, t2, tiles, pair, sets, patterns) {
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
    if (patterns) {
      return this.generate(tiles, pair, patterns.add([tile,t1,t2].sort()));
    }
    return this.check(tiles, pair, sets-1);
  }

  tryPung(tile, tiles, pair, sets, patterns) {
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
    if (patterns) {
      return this.generate(tiles, pair, patterns.add([tile, tile, tile]));
    }
    return this.check(tiles, pair, sets-1);
  }

  tryKong(tile, tiles, pair, sets, patterns) {
    // remove first duplicate
    var pos = tiles.indexOf(tile);
    if(pos === -1) return false;
    tiles.splice(pos,1);

    // remove second duplicate
    pos = tiles.indexOf(tile);
    if(pos === -1) return false;
    tiles.splice(pos,1);

    // remove third duplicate
    pos = tiles.indexOf(tile);
    if(pos === -1) return false;
    tiles.splice(pos,1);

    // recurse
    this.log("kong",tile,"worked");
    if (patterns) {
      return this.generate(tiles, pair, patterns.add([tile, tile, tile, tile]));
    }
    return this.check(tiles, pair, sets-1);
  }
}

module.exports = new FSA();
