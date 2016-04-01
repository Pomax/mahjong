// treat a tile as an HTML image element
var Tile = function(tileNumber, concealed) {
  this.tileNumber = tileNumber;
  this.concealed = concealed;
  this.init();
};

Tile.prototype = {
  init: function() {
    // ...
  }
};

module.exports = Tile;
