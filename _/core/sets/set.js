/**
 * This object represents a set of tiles. While any size is possible,
 * the game itself is only really concerned with sets of two tiles,
 * forming a pair, three tiles, forming a pung, or four tiles, forming
 * a kong.
 */
var Set = function(){
  this.tiles = [];
};

Set.prototype = {
  tiles: [],

  get: function(idx) {
    return this.tiles[idx];
  },
  add: function(tile) {
    this.tiles.push(tile);
  },
  meldKong: function(tile) {
    if(this.tiles.length!==3) return false;
    var t = this.tiles,
        m = tile.tileNumber;
    if (t[0].tileNumber===m && t[1].tileNumber===m && t[2].tileNumber===m) {
      this.tiles.push(tile);
      return true;
    }
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
      div.setAttribute("class", "set");
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

Set.prototype.constructor = Set;

Set.fromHand = function(hand, tileNumber, setSize, sequential) {
  var set = new Set(),
      count = 0,
      bank = hand.concealed,
      tile = bank.getTileByNumber(tileNumber);

  // For sequential sets, we assume tileNumber represents
  // the first tile in the sequence.
  if(sequential) {
    if (bank.hasSequence(tileNumber, setSize)) {
      set.tiles = set.tiles.concat(bank.removeSequence(tileNumber, setSize));
    } else {
      throw "cannot form a sequential set of size "+setSize+" starting at tile number "+tileNumber;
    }
  }

  else {
    if (bank.hasSet(tileNumber, setSize)) {
      set.tiles = set.tiles.concat(bank.removeSet(tileNumber, setSize));
    } else {
      throw "cannot form a set of size "+setSize+" for tile number "+tileNumber;
    }
  }

  return set;
};

Set.formPair = function(hand, tileNumber) {
  return Set.fromHand(hand, tileNumber, 2);
};

Set.formPung = function(hand, tileNumber) {
  return Set.fromHand(hand, tileNumber, 3);
};

Set.formKong = function(hand, tileNumber) {
  return Set.fromHand(hand, tileNumber, 4);
};

Set.formChow = function(hand, tileNumber) {
  return Set.fromHand(hand, tileNumber, 3, true);
};
