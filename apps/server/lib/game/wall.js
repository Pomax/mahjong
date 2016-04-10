var logger = require('../logger');
var Constants = require('../constants');
var Tiles = require('./tiles');

var Wall = function () {
  this.log = logger("wall");
  this.formTiles();
};

Wall.prototype = {
  deadCount: Constants.DEADWALL,

  reset: function() {
    this.formTiles();
  },

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

    this.__rigTiles(this.tiles);
  },

 __rigTiles: function(tiles) {
   this.tiles = [];

   var patterns = {
     needsPair:  [0,0,0, 1,1,1, 2,2,2, 3,3,3, 4],  // needs 4
     needsPung:  [0,0,0, 1,1,1, 2,2,2, 3,3, 4,4],  // needs 3 or 4
     needsChow1: [7,7, 0,1,2, 0,1,2, 0,1,2, 5,6],  // needs 4, as chow1
     needsChow2: [7,7, 0,1,2, 0,1,2, 0,1,2, 3,5],  // needs 4, as chow2
     needsChow3: [7,7, 0,1,2, 0,1,2, 0,1,2, 2,3],  // needs 4, as chow3
     hasKong:    [0,0, 1,1, 2,2, 3,3, 4,4,4,4, 5]  // has kong of 4
   };

   var needed = 4;
   var pattern = patterns.hasKong;

   pattern.concat([needed]).forEach(tile => {
     var pos = tiles.indexOf(tile);
     tiles.splice(pos,1);
   });

   this.tiles = pattern.concat([needed]).concat(tiles);
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
