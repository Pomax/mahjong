'use strict'

/**
 * A strategy decides which tiles a player should "go for",
 * building a list of [tiles]=>[claim codes] mappings,
 */

var Constants = require('../constants');
var debug = false;

/**
 * Generate the list of requiremenets given the
 * current hand configuration, based on what sets
 * we can build. To determine this, we run the
 * entire hand through a pattern building FSA,
 * once for each tile in hand.
 */
function generateRequired(tiles, tracker) {
  var required = {};
  tiles = tiles.map(v => parseInt(v));
  // Highly inefficient for now, but that's fine:
  //
  //   1) make it work,
  //   2) make it work faster,
  //   3) repeat step 2.
  //
  tiles.forEach((tile,pos) => {
    let stiles = tiles.slice();
    stiles.splice(pos,1);
    single(tile, stiles, required, tracker);
  });
  return required;
}

/**
 * Start the FSA for the single tile provided
 */
function single(tile, tiles, required, tracker) {
  if(debug)
    console.log('(single) checking '+tile+' in ', tiles);
  checkPair(tile, tiles.slice(), required, tracker);
  checkConnected(tile, tiles.slice(), required, tracker);
  checkGapped(tile, tiles.slice(), required, tracker);
}

// Analysis for 1 tile.

/**
 * Given a single tile, do we have a tile in our hand
 * that lets us form a pair? This would let us form a
 * pung by claiming the third tile.
 */
function checkPair(tile, tiles, required, tracker) {
  if(debug)
    console.log('(pair) checking '+tile+' in ', tiles);
  var pos = tiles.indexOf(tile);
  if (pos > -1) {
    // we have a pair, so we can try for a pung
    tiles.splice(pos,1);
    checkPung(tile, tiles, required, tracker);
  } else {
//    append(required, tile, Constants.PAIR, tracker);
  }
}

/**
 * Given a single tile, do we have a tile in our hand
 * that lets us form a sequence of two? This would let
 * us form a chow by claiming the remaining third, if
 * we don't already have that in hand.
 */
function checkConnected(tile, tiles, required, tracker) {
  if(debug)
    console.log('(connected) checking '+tile+' in ', tiles);
  var p = tiles.indexOf(tile-1);
  if(p>-1) {
    let ptiles = tiles.slice();
    ptiles.splice(p,1);
    if (!checkChow3(p, tile, ptiles)) {
      append(required, tile+1, Constants.CHOW3, tracker);
    }
  }
  var n = tiles.indexOf(tile+1);
  if(n>-1) {
    let ntiles = tiles.slice();
    ntiles.splice(p,1);
    if (!checkChow1(tile, n, ntiles)) {
      append(required, tile-1, Constants.CHOW1, tracker);
    }
  }
}

/**
 * Given a single tile, do we have a tile in our hand
 * that lets us form a sequence, with the middle tile
 * missing? This would let us form a chow by claiming
 * the remaining third, if we don't have that in hand.
 */
function checkGapped(tile, tiles, required, tracker) {
  if(debug)
    console.log('(gapped) checking '+tile+' in ', tiles);
  // This situation, if we don't already have a
  // chow, means we require the center tile
  var p = tiles.indexOf(tile-2);
  if(p>-1) {
    let ptiles = tiles.slice();
    ptiles.splice(p,1);
    if (!checkChow2(p, tile, ptiles)) {
      append(required, tile-1, Constants.CHOW2, tracker);
    }
  }
  var n = tiles.indexOf(tile+2);
  if(n>-1) {
    let ntiles = tiles.slice();
    ntiles.splice(p,1);
    if (!checkChow2(tile, n, ntiles)) {
      append(required, tile+1, Constants.CHOW2, tracker);
    }
  }
}

// Analysis for 2 tiles.

/**
 * Given a pair, do we have a tile in our hand
 * that lets us form a pung? This would let us
 * form a kong through claiming. If not, we want
 * this tile if it gets discarded, to form a pung.
 */
function checkPung(tile, tiles, required, tracker) {
  if(debug)
    console.log('(pung) checking '+tile+' in ', tiles);
  // This situation, means we 'need' this
  // tile to form a kong. It's not a true
  // need, because the pung itself already
  // lets us win.
  var pos = tiles.indexOf(tile);
  if (pos > -1) {
    // we have a pung, but _might_ form a kong
    tiles.splice(pos,1);
    checkKong(tile, tiles, required, tracker);
  } else {
    // we can form a pung
    append(required, tile, Constants.PUNG, tracker);
  }
}

/**
 * Do we have a chow? End of the line, there is nothing
 * we can form further down the line with this.
 */
function checkChow1(t2, t3, tiles) {
  if(debug)
    console.log('(chow1) checking ./'+t2+'/'+t3+' in ', tiles);
  // this situation does not require any tiles
  var pos = tiles.indexOf(t2-1);
  return pos > -1;
}

/**
 * Do we have a chow? End of the line, there is nothing
 * we can form further down the line with this.
 */
function checkChow2(t1, t3, tiles) {
  if(debug)
    console.log('(chow2) checking '+t1+'/./'+t3+' in ', tiles);
  // this situation does not require any tiles
  var pos = tiles.indexOf(t1+1);
  return pos > -1;
}

/**
 * Do we have a chow? End of the line, there is nothing
 * we can form further down the line with this.
 */
function checkChow3(t1, t2, tiles) {
  if(debug)
    console.log('(chow3) checking '+t1+'/'+t2+'/. in ', tiles);
  // this situation does not require any tiles
  var pos = tiles.indexOf(t2+1);
  return pos > -1;
}

// Analysis for 3 tiles.

/**
 * Do we have a kong? If so, end of the line, there is
 * nothing we can form further down the line with this.
 * If not, we already have a pung, but we can form a
 * a kong by claiming the fourth tile on a discard.
 */
function checkKong(tile, tiles, required, tracker) {
  if(debug)
    console.log('(kong) checking '+tile+' in ', tiles);
  var pos = tiles.indexOf(tile);
  if (pos > -1) {
    tiles.splice(pos,1);
    // done, we already have a kong
  } else {
    // we _could_ form a kong
    append(required, tile, Constants.KONG, tracker);
  }
}

// Utility functions

/**
 * Append a requirement (=claim code) for a tile,
 * provided the tile is still available somewhere.
 */
function append(required, tile, type, tracker) {
  var p = tracker.getProbability(tile);
  if (p === 0) return;
  if (!required[tile]) { required[tile] = []; }
  if (required[tile].indexOf(type) === -1) {
    required[tile].push(type);
  }
}

module.exports = generateRequired;
