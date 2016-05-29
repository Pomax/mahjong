'use strict';

var Constants = require('./constants');

class Wall {

  constructor() {
    this.deadCount = Constants.DEADWALL;
    this.reset();
  }

  reset() {
    this.formTiles();
  }

  formTiles() {
    this.tiles = [];

    // form permuted array, i.e. "a shuffled wall"
    var tiles = Constants.DEFAULT_WALL, tile;
    while (tiles.length) {
      let pos = Math.random() * tiles.length;
      tile = tiles.splice(pos, 1)[0];
      this.tiles.push(tile);
    }

    this.rigWall(this.tiles);
  }

  rigWall(tiles) {
    // TODO: rig a wall
  }

  length() {
    return this.tiles.length;
  }

  playlength() {
    return this.tiles.length - this.deadCount;
  }

  isDead() {
    return this.tiles.length <= this.deadCount;
  }

  draw() {
    if (this.isDead()) return Constants.NOTILE;
    return this.tiles.pop();
  }

  getInitialTiles(size) {
    size = size || Constants.HANDSIZE -1;
    return this.tiles.splice(0,size);
  }

  drawSupplement() {
    if (this.isDead()) return Constants.NOTILE;
    return this.tiles.splice(0,1)[0];
  }

  toString() {
    return this.tiles.join(",");
  }
};

module.exports = Wall;
