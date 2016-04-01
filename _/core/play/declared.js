/**
 * This object is similar to a Bank, but rather than containing
 * tiles the declared bank contains sets.
 *
 * NOTE: we cannot remove declared sets, and they are always open.
 */
(function(global) {

  var Declared = function(type) {
    this.sets = [];
    Object.defineProperty(this, "length", {
      get: function() { return this.sets.length; },
      set: function() {}
    });
  };

  Declared.prototype = {
    // add a set to this bank
    add: function(set) {
      set.reveal();
      set.clearMarks();
      this.sets.push(set);
      if (this.el) {
        this.el.appendChild(set.asHTMLElement());
      }
    },

    // forEach shortcut
    forEach: function(fn) {
      this.sets.forEach(fn);
    },

    // Convert to an array of {array of tileNumbers},
    // one array per set.
    toTileNumbers: function() {
      var numbers = [];
      this.sets.forEach(function(set) {
        numbers = numbers.concat([set.toTileNumbers()]);
      });
      return numbers;
    },

    // sort this bank
    sort: function() {
      this.sets.sort(function(a,b) {
        a = a.get(0).tileNumber;
        b = b.get(0).tileNumber;
        return Constants.sortFunction(a,b);
      });
      this.asHTMLElement(true);
    },

    // try to meld a kong with this tile. The return
    // value is whether or not a kong meld occurred.
    formMeldedKong: function(tile) {
      var set, s, last = this.sets.length;
      for (s = 0; s < last; s++) {
        set = this.sets[s];
        if (set.meldKong(tile)) {
          return true;
        }
      }
      return false;
    },

    // this bank as HTML element
    asHTMLElement: function(update) {
      var div;
      if(!this.el) {
        div = document.createElement("div");
        div.setAttribute("class", "declared bank");
        (this.sets).forEach(function(set) { div.appendChild(set.asHTMLElement()); });
        this.el = div; }
      else if(update===true) {
        div = this.el;
        div.innerHTML = "";
        (this.sets).forEach(function(set) { div.appendChild(set.asHTMLElement()); });
      }
      return this.el;
    }
  };

  Declared.prototype.constructor = Declared;


  // require.js
  if(global.define) { global.define(function() { return Declared; }); }

  // node.js
  else if(global.module && global.module.exports) { global.module.exports = Declared; }

  // plain browser
  else { global.Declared = Declared; }

}(this));
