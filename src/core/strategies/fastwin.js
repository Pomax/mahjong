'use strict'

var Constants = require('../constants');
var debug = false;

function append(required, tile, type) {
  if (!required[tile]) {
    required[tile] = [];
  }
  if (required[tile].indexOf(type)===-1) {
    required[tile].push(type);
  }
}

function generateRequired(tiles, tracker) {
  var required = {};
  tiles = tiles.map(v => parseInt(v));
  // highligh inefficient, for now. And that's fine.
  // 1) make it work, 2) make it work fast.
  tiles.forEach((tile,pos) => {
    let stiles = tiles.slice();
    stiles.splice(pos,1);
    single(tile, stiles, required);
  });
  return required;
}

// 1 tile

function single(tile, tiles, required) {
  if(debug)
    console.log('(single) checking '+tile+' in ', tiles);
  checkPair(tile, tiles.slice(), required);
  checkConnected(tile, tiles.slice(), required);
  checkGapped(tile, tiles.slice(), required);
}

// 2 tiles

function checkPair(tile, tiles, required) {
  if(debug)
    console.log('(pair) checking '+tile+' in ', tiles);
  var pos = tiles.indexOf(tile);
  if (pos > -1) {
    // we have a pair, so we can try for a pung
    tiles.splice(pos,1);
    checkPung(tile, tiles, required);
  } else {
//    append(required, tile, Constants.PAIR);
  }
}

function checkConnected(tile, tiles, required) {
  if(debug)
    console.log('(connected) checking '+tile+' in ', tiles);
  // This situation, if we don't already have a
  // chow, means we require either the left or
  // right tiles.
  var p = tiles.indexOf(tile-1);
  if(p>-1) {
    let ptiles = tiles.slice();
    ptiles.splice(p,1);
    if (!checkChow3(p, tile, ptiles)) {
      append(required, tile+1, Constants.CHOW3);
    }
  }
  var n = tiles.indexOf(tile+1);
  if(n>-1) {
    let ntiles = tiles.slice();
    ntiles.splice(p,1);
    if (!checkChow1(tile, n, ntiles)) {
      append(required, tile-1, Constants.CHOW1);
    }
  }
}

function checkGapped(tile, tiles, required) {
  if(debug)
    console.log('(gapped) checking '+tile+' in ', tiles);
  // This situation, if we don't already have a
  // chow, means we require the center tile
  var p = tiles.indexOf(tile-2);
  if(p>-1) {
    let ptiles = tiles.slice();
    ptiles.splice(p,1);
    if (!checkChow2(p, tile, ptiles)) {
      append(required, tile-1, Constants.CHOW2);
    }
  }
  var n = tiles.indexOf(tile+2);
  if(n>-1) {
    let ntiles = tiles.slice();
    ntiles.splice(p,1);
    if (!checkChow2(tile, n, ntiles)) {
      append(required, tile+1, Constants.CHOW2);
    }
  }
}

// 3 tiles

function checkPung(tile, tiles, required) {
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
    checkKong(tile, tiles, required);
  } else {
    // we can form a pung
    append(required, tile, Constants.PUNG);
  }
}

function checkChow1(t2, t3, tiles) {
  if(debug)
    console.log('(chow1) checking ./'+t2+'/'+t3+' in ', tiles);
  // this situation does not require any tiles
  var pos = tiles.indexOf(t2-1);
  return pos > -1;
}

function checkChow2(t1, t3, tiles) {
  if(debug)
    console.log('(chow2) checking '+t1+'/./'+t3+' in ', tiles);
  // this situation does not require any tiles
  var pos = tiles.indexOf(t1+1);
  return pos > -1;
}

function checkChow3(t1, t2, tiles) {
  if(debug)
    console.log('(chow3) checking '+t1+'/'+t2+'/. in ', tiles);
  // this situation does not require any tiles
  var pos = tiles.indexOf(t2+1);
  return pos > -1;
}

// 4 tiles

function checkKong(tile, tiles, required) {
  if(debug)
    console.log('(kong) checking '+tile+' in ', tiles);
  var pos = tiles.indexOf(tile);
  if (pos > -1) {
    tiles.splice(pos,1);
    // done, we already have a kong
  } else {
    // we _could_ form a kong
    append(required, tile, Constants.KONG);
  }
}

module.exports = generateRequired;
