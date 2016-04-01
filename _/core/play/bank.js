/**
 * A bank represents a collection of tiles that are associated
 * with a player's hand. The usually "banks" are the concealed
 * tile set, the open/revealed tile set, and the bonus tiles.
 */
(function(global) {

  var Bank = function(type) {
    this.type = type;
    this.tiles = [];
    this.record = new TileRecorder();
    Object.defineProperty(this, "length", {
      get: function() { return this.tiles.length; },
      set: function() {}
    });
  };


  Bank.prototype = {

    // add a tile to this bank
    add: function(tile) {
      // internal update
      this.tiles.push(tile);
      this.record.add(tile);
      // UI update if we have a UI element
      if(this.el) {
        this.el.appendChild(tile);
      }
    },

    // does this tile exist in this bank?
    contains: function(tile) {
      var tileNumber = tile.tileNumber,
          i = this.tiles.length;
      while (i-- > 0) {
        tile = this.tiles[i];
        if (tile.tileNumber === tileNumber) {
          return true;
        }
      }
      return false;
    },

    // forEach shortcut
    forEach: function(fn) {
      this.tiles.forEach(fn);
    },

    // count how many times this tile exists in the hand
    getCount: function(tile) {
      var tileNumber = tile.tileNumber,
          i = this.tiles.length,
          ccount = 0;
      while (i-- > 0) {
        tile = this.tiles[i];
        if (tile.tileNumber === tileNumber) {
          ccount++;
        }
      }
      return ccount;
    },

    // get a tile by tile number
    getTileByNumber: function(tileNumber) {
      var tile,
          i = this.tiles.length;
      while (i-- > 0) {
        tile = this.tiles[i];
        if (tile.tileNumber === tileNumber) {
          return tile;
        }
      }
      if(window.debug) {
        debug("could not find "+tileNumber+" in "+this.toTileNumbers().join(","));
      }
      return false;
    },

    // remove a tile by its tilenumber
    removeTileByNumber: function(tileNumber) {
      var tile,
          i = this.tiles.length;
      while (i-- > 0) {
        tile = this.tiles[i];
        if (tile.tileNumber === tileNumber) {
          this.remove(tile);
          return tile;
        }
      }
      if(window.debug) {
        debug("could not find "+tileNumber+" in "+this.toTileNumbers().join(","));
      }
      return false;
    },

    // remove a tile from this bank
    remove: function(tile) {
      var tiles = this.tiles,
          last = tiles.length,
          t;
      for (t = 0; t < last; t++) {
        if (tiles[t] === tile) {
          // remove internally
          tiles.splice(t,1);
          this.record.remove(tile);
          // UI update if we have a UI element
          if (this.el) {
            this.el.removeChild(tile);
          }
        }
      }
    },

    // reveal one or all tiles in this bank
    reveal: function(tile) {
      if (tile) {
        return tile.reveal();
      }
      this.tiles.forEach(function(tile) {
        tile.reveal();
      });
    },

    // clear all tile markings
    clearMarks: function() {
      this.tiles.forEach(function(tile) {
        tile.clearMarks();
      });
    },

    // sort this bank on tilenumber
    sort: function() {
      this.tiles.sort(function(a,b) {
        a = a.tileNumber;
        b = b.tileNumber;
        return Constants.sortFunction(a,b);
      });
      // UI update if we have a UI element
      if (this.el) {
        this.asHTMLElement(true);
      }
    },

    // convert the tile set to an array of tile numbers
    toTileNumbers: function() {
      var numbers = [];
      this.tiles.forEach(function(tile) {
        numbers.push(tile.tileNumber);
      });
      return numbers;
    },

    hasSet: function(tileNumber, setSize) {
      return this.record.tile(tileNumber) >= setSize;
    },

    removeSet: function(tileNumber, setSize) {
      var tiles = [],
          count = 0;
      while(count++ < setSize) {
        console.log(tileNumber);
        tiles.push(this.removeTileByNumber(tileNumber));
      }
      return tiles;
    },

    hasSequence: function(tileNumber, count) {
      // suit check
      var suit = Tiles.getTileSuit(tileNumber);
      var has = true, i;
      for(i=0; i<count; i++) {
        has = has && (this.record.tile(tileNumber+i) > 0 && Tiles.getTileSuit(tileNumber+i) === suit);
      }
      return has;
    },

    removeSequence: function(tileNumber, setSize) {
      var tiles = [],
          i;
      for(i=0; i<setSize; i++) {
        tiles.push(this.removeTileByNumber(tileNumber + i));
      }
      return tiles;
    },

    // this bank as HTML element
    asHTMLElement: function(update) {
      var div;
      if(!this.el) {
        div = document.createElement("div");
        div.setAttribute("class", this.type + " bank");
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

  Bank.prototype.constructor = Bank;

  // require.js
  if(global.define) { global.define(function() { return Bank; }); }

  // node.js
  else if(global.module && global.module.exports) { global.module.exports = Bank; }

  // plain browser
  else { global.Bank = Bank; }

}(this));
