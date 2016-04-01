/**
 * This object represents a run of tiles. While any size is possible,
 * the game itself is only really concerned with sets of three consecutive
 * numbered tiles from the same suit.
 */
var Run = function(hand, tileNumber, setSize) {
  var Run = this;
  this.tiles = [];

  var count = 0;
  var bank = hand.concealed;
  var tile, i;

  tileNumber += setSize-1;

  // can we do this?
  for(i = bank.tiles.length - 1; i>=0; i--) {
    tile = bank.tiles[i];
    if(tile.tileNumber === tileNumber) {
      this.add(tile);
      count++;
      tileNumber--;
    }
  }
  // we cannot:
  if (count < setSize) {
    throw "cannot form a set of size "+setSize+" for tile "+(tileNumber + 1 - setSize);
  }
  // we can:
  this.tiles = this.tiles.slice(0,setSize);
  for(i=0; i<setSize; i++) {
    this.tiles[i].reveal();
    bank.remove(this.tiles[i]);
  }
  this.tiles.reverse();
};

Run.prototype = {
  tiles: [],
  get: function(idx) {
    return this.tiles[idx];
  },
  add: function(tile) {
    this.tiles.push(tile);
  },
  meldKong: function(tile) {
    return false;
  },
  reveal: function() {
    this.tiles.forEach(function(t){ t.reveal(); });
  },
  clearMarks: function() {
    this.tiles.forEach(function(t){ t.clearMarks(); });
  },
  // convert to array of tileNumbers
  toTileNumbers: function() {
    var numbers = [];
    this.tiles.forEach(function(tile) {
      numbers.push(tile.tileNumber);
    });
    return numbers;
  },
  asHTMLElement: function(update) {
    var div;
    if(!this.el) {
      div = document.createElement("div");
      div.setAttribute("class", "run");
      (this.tiles).forEach(function(tile) { div.appendChild(tile); });
      this.el = div; }
    else if(update===true) {
      div = this.el;
      div.innerHTML = "";
      (this.tiles).forEach(function(tile) { div.appendChild(tile); });
    }
    return this.el;
  }
};

Run.prototype.constructor = Run;

// The possible runs in a game of MJ: 2 tiles is a connected pair.
// It's an incomplete pattern that lets us determine that there is
// the potential for getting a chow.
var ConnectedPair = function(hand, tileNumber) {
  return new Run(hand, tileNumber, 2);
};

// The possible runs in a game of MJ: 3 tiles form a chow.
var Chow = function(hand, tileNumber) {
  return new Run(hand, tileNumber, 3);
};