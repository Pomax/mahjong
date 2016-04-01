var logger = require('../logger');
var Constants = require('../constants');
var Tiles = require('./tiles');

var Wall = function () {
  this.formTiles();
};

Wall.prototype = {
  deadCount: Constants.DEADWALL,

  formTiles: function() {
    this.tiles = [];

    // create sorted array of tile numbers
    var tiles = [], i;
    for(i=0; i<Constants.PLAYTILES; i++) { tiles = tiles.concat([i,i,i,i]); }
    for(j=0; j<Constants.BONUSTILES; j++) { tiles = tiles.concat([i+j]); }

    // form permuted array, i.e. "a shuffled wall"
    var tile;
    while(tiles.length>0) {
      tile = tiles.splice((Math.random()*tiles.length), 1)[0];
      this.tiles.push(tile);
    }
  },

  length: function() {
    return this.tiles.length;
  },

  playlength: function() {
    return this.tiles.length - this.deadCount;
  },

  isDead: function() {
    return this.tiles.length <= this.deadCount;
  },

  draw: function() {
    if (this.isDead()) return Constants.NOTILE;
    return this.tiles.pop();
  },

  deal: function(size) {
    size = size || Constants.HANDSIZE -1;
    return this.tiles.splice(0,size);
  },

  drawSupplement: function() {
    if (this.isDead()) return Constants.NOTILE;
    return this.tiles.splice(0,1)[0];
  }
};

module.exports = Wall;
