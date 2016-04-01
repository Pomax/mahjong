/**
 * This models a player's "hand", i.e. the tiles they play with.
 * A hand consists of three sets of tiles:
 * - concealed tiles, which the player can still play with
 * - revealed, or open tiles, which are visible to all and immutably played
 * - bonus tiles, which are not part of play, but give a player extra points (somehow)
 *
 * In addition to this, a player hand has a play strategy associated with it.
 * While intuitively this should be stored at the Player level, there is no
 * logical difference between a player, and the hand they are playing.
 *
 * For short code paths, it's kept here, instead.
 */

var Hand = function() {
  this.concealed = new Bank("concealed");
  this.values = [];
  this.bonus = new Bank("bonus");
  this.open = new Declared();
  this.strategy = { discard: [], required: []};
};

Hand.prototype = {
  // add a tile to this hand
  add: function(tile) { this.concealed.add(tile); this.concealed.sort(); },
  // add a bonus tile to this hand
  addBonus: function(tile) { tile.reveal(); this.bonus.add(tile); this.bonus.sort(); },
  // remove a tile from this hand (we can only remove concealed tiles)
  remove: function(tile) { this.concealed.remove(tile); },
  // play a set of tiles by moving them to the "open" tile bank
  play: function(tile, setType, origin) {
    var set = false;
    if (setType === Constants.PAIR) {
      // we can only claim a pair if it will let us win
      console.log("player implicitly declared win");
    }
    this.sort();
    switch(setType) {
      case Constants.PAIR: { set = new Pair(this, tile.tileNumber); } break;
      case Constants.CHOW: {
        var tn = tile.tileNumber;
        console.log("trying chow for "+tn);
        var prev2 = this.concealed.contains({tileNumber: tn-2});
        var prev1 = this.concealed.contains({tileNumber: tn-1});
        var next1 = this.concealed.contains({tileNumber: tn+1});
        console.log(prev2, prev1, "-", next1);

        var tnm2 = prev2 && prev1 && Tiles.isLegalChow(tn-2, tn-1, tn),
            tnm1 = prev1 && next1 && Tiles.isLegalChow(tn-1, tn, tn+1);
        if (tnm2)     { set = Set.formChow(this, tn-2); }
        else if(tnm1) { set = Set.formChow(this, tn-1); }
        else          { set = Set.formChow(this, tn);   }
      } break;
      case Constants.PUNG: { set = Set.formPung(this, tile.tileNumber); } break;
      case Constants.KONG: { set = Set.formKong(this, tile.tileNumber); } break;
    }
    this.open.add(set);
    this.concealed.remove(tile);
  },
  // reveal this hand. This means we need only show the concealed bank
  reveal: function() { this.concealed.reveal(); },
  // sort this hand. This sorts all banks.
  sort: function() {
    this.concealed.sort();
    this.open.sort();
    this.bonus.sort();
  },
  // try to meld a kong with this tile
  formMeldedKong: function(tile) {
    if(this.open.formMeldedKong(tile)) {
      this.concealed.remove(tile);
      return true;
    }
    return false;
  },
  // does the hand contain a kong?
  hasKong: function(tile) {
    return this.concealed.getCount(tile) === 4;
  },
  // determine what we want to pay attention to during play
  determineStrategy: function(wall, players) {
    this.strategy = Strategies.pick(wall, this.concealed, players);
    return this.strategy;
  },
  determineValues: function(concealed) {
    // for each tile "t", get the value of "t", given {hand with "t" removed}
    var values = this.values = [];
    concealed.forEach(function(t) {
      // form {hand with "t" removed}
      var copied = concealed.slice();
      copied.splice(copied.indexOf(t),1);
      // compute "t" value
      values.push(Tiles.getTileType(t, copied));
    });
    return values;
  },
  // pick a tile to discard
  pickDiscard: function() {
    console.log(this.strategy);
    var discards = this.strategy.discard;

    if(discards.length>0) {
      // discard the lowest ranked tile.
      var tileNumber = discards.splice(0,1)[0];
      return this.concealed.getTileByNumber(tileNumber);
    }

    else {
      console.log("difficult hand:");
      console.log(this.concealed.toTileNumbers(), this.open.toTileNumbers());
      var values = this.determineValues(this.concealed.toTileNumbers());

      // there are no "obvious" discards. This can be because we've
      // just won, or because we have a difficult hand in which all
      // tiles are already useful. Find out which it is.
      if (Tiles.isWinningPattern(values, this.open)) {
        console.log("player holds a winning pattern");
        return Constants.WIN;
      }

      else {
        // can we break up something "good"?
        var pos = values.indexOf(Constants.GAPPED);
        if(pos !== -1) {
          tile = this.concealed.get(pos);
          console.log("gapped discard: "+tile);
          return tile;
        }
        pos = values.indexOf(Constants.CONNECTED);
        if(pos !== -1) {
          tile = this.concealed.get(pos);
          console.log("connecting discard: "+tile);
          return tile;
        }
        pos = values.indexOf(Constants.PAIR);
        if(pos !== -1) {
          tile = this.concealed.get(pos);
          console.log("pair discard O_O: "+tile);
          return tile;
        }
        // !!danger zone!!
        pos = values.indexOf(Constants.KONG);
        if(pos !== -1) {
          tile = this.concealed.get(pos);
          console.log("danger zone - pung discard O_O: "+tile);
          return tile;
        }
        pos = values.indexOf(Constants.PUNG);
        if(pos !== -1) {
          tile = this.concealed.get(pos);
          console.log("danger zone - pung discard O_O: "+tile);
          return tile;
        }
        throw "DAH!";
      }
    }

    // last resort
    console.log("No idea what to do - picking first tile in hand as discard...");
    return this.concealed.get(0);
  },
  // administration at the end of turn for this player
  clearMarks: function() { this.concealed.clearMarks(); },
  // are we looking for this tile?
  lookingFor: function(tile, mayChow) {
    var nothing = {
      inhand: Constants.NOTHING,
      claimType: Constants.NOTHING
    };
    var pos = this.strategy.required.indexOf(tile.tileNumber);
    if (pos===-1) return nothing;
    var role = this.strategy.role[pos],
        claimType = Tiles.getClaimType(role);
    // But actually, will this tile let us win?
    var hypotheticalHand = this.concealed.toTileNumbers().concat([tile.tileNumber]).sort(),
        values = this.determineValues(hypotheticalHand);
    if (Tiles.isWinningPattern(values, this.open)) {
      claimType = Constants.WIN;
    }
    // if we can't win, and we want to chow, can we?
    else if(claimType === Constants.CHOW && !mayChow) {
      return nothing;
    }
    return {
      inhand: role,
      claimType: claimType
    };
  },
  // this hand as HTML element
  asHTMLElement: function(update) {
    if(!this.el) {
      var div = document.createElement("div");
      div.setAttribute("class", "hand");
      div.appendChild(this.concealed.asHTMLElement());
      var open = this.open.asHTMLElement();
      open.classList.add("open");
      div.appendChild(open);
      div.appendChild(this.bonus.asHTMLElement());
      this.el = div; }
    else if(update===true) {
      this.concealed.asHTMLElement(true);
      this.open.asHTMLElement(true);
      this.bonus.asHTMLElement(true);
    }
    return this.el;
  }
};

Hand.prototype.constructor = Hand;
