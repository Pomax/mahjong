/**
 * Mahjong "wall" implementation
 */

var Wall = function () {
  this.tiles = [];
  this.discards = [];

  // create sorted array
  var tiles = [], i;
  for(i=0; i<Constants.PLAYTILES; i++) {
    tiles = tiles.concat([i,i,i,i]);
  }
  tiles = tiles.concat([Constants.PLUM,Constants.ORCHID,Constants.CHRYSANTHEMUM,Constants.BAMBOO,
                        Constants.SPRING,Constants.SUMMER,Constants.FALL,Constants.WINTER]);
  // permute the array
  var tileNumber;
  while(tiles.length>0) {
    tileNumber = tiles.splice((Math.random()*tiles.length), 1)[0];
    this.tiles.push(Tiles.create(tileNumber, true));
  }

  for(var t=0, len=this.tiles.length; t<this.deadCount; t++) {
    this.tiles[len-(1+t)].src = "tiles/dead.jpg";
  }

  Object.defineProperty(this, "length", {
    get: function() { return this.tiles.length; },
    set: function() {}
  });
};

Wall.prototype = {
  tiles: [],
  discards: [],
  deadCount: Constants.DEADWALL,
  // is this wall dead? (i.e. no more tiles available for drawing)
  isDead: function() { return this.tiles.size <= this.deadCount; },
  // draw a tile, unless we're in the dead wall
  draw: function() {
    if (this.length <= this.deadCount) { return Constants.NOTILE; }
    var tile = this.tiles.splice(0,1)[0];
    if (this.el) {
      var wall = this.el.querySelector(".wall");
      wall.removeChild(wall.children.item(0)); }
    return tile;
  },
  // draw a supplement tile, unless we've exhausted the wall
  drawSupplement: function() {
    return (this.length>this.deadCount ? this.tiles.splice(this.tiles.length-1,1)[0] : Constants.NOTILE);
  },
  // treat tile as discarded
  addDiscard: function(tile) {
    tile.clearMarks();
    tile.reveal();
    this.discards.push(tile);
    if (this.el) { this.el.querySelector(".discards").appendChild(tile); }
  },
  // this wall as an HTML element
  asHTMLElement: function() {
    if(!this.el) {
      var div = document.createElement("div"),
          wall = document.createElement("div"),
          discard = document.createElement("div");
      wall.setAttribute("class", "wall");
      discard.setAttribute("class", "discards");
      div.appendChild(wall);
      div.appendChild(discard);
      (this.tiles).forEach(function(tile) { wall.appendChild(tile); });
      this.el = div; }
    return this.el;
  },
  // show all tiles in the wall
  reveal: function() {
    (this.tiles).forEach(function(tile) { tile.reveal(); });
  }
};

Wall.prototype.constructor = Wall;
