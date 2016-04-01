/**
 * This object takes a hand in the form of a heap of concealed tiles,
 * and an ordered set of declared sets, and determines which tiles
 * are required to form a good hand, and which tiles should be
 * discarded while the required tiles are being picked up.
 */

var Generator = {

  // generate the set of (reasonably) possible hands
  generate: function(concealedTiles, players) {
    var copied = concealedTiles.slice(0);
    copied.sort(Constants.sortFunction);
    return this.expand(copied, players);
  },

  // Generate all possible answers to the question "what do
  // we need to discard, and what do we need to pick up, to
  // get to a good hand?", using the provided information.
  expand: function(permutable, players) {
    var discard = [];

    // First, we weed all tiles that do not already
    // form a (connected) pair, or gapped chow, since
    // these tiles are essentially irrelevant.
    var t = permutable.length, tileNumber,
        copied = [], tileTypes = [];

    // first, mark all tiles as "what can I use them for" tiles,
    // using the Tiles.getTileType/2 function.
    while(t-->0) {
      tileNumber = permutable[t];
      copied = permutable.slice(0);
      copied.splice(t,1);
      tileTypes[t] = Tiles.getTileType(tileNumber, copied);
    }

    // Then, filter out all the single tiles. Except for a limit
    // hand, or hands that only require a pair to be a winning hand,
    // single tiles do not contribute to a good stategy.
    t = permutable.length;
    while(t-->0) {
      if(tileTypes[t]===Constants.SINGLE) {
        discard.push(permutable.splice(t,1)[0]);
        tileTypes.splice(t,1); }}

    // With the remaining good tiles, and a knowledge of which
    // patterns they can be used in, determine which tiles we
    // still need to complete a partial good hand.
    // (How that hand is then actually finished is entirely up
    // to the A.I. "speed vs. score vs. not losing" algorithm.)
    var partials = {required: [], role: []}, partial;
    var last = permutable.length;
    var administrate = function(p){
      if(p.required.length>0) {
        partials.required = partials.required.concat(p.required);
        partials.role = partials.role.concat(p.role);
      }
    };

    for(t=0; t<last; t++) {
      // determine how we can get to a (partial) good hand
      partial = this.fulfill(t, permutable, tileTypes);
      // add (each) partial hand to the list of known partials
      if (partial.constructor.name !== "Array") { partial = [partial]; }
      partial.forEach(administrate);
    }

    var match = 1, bin;
    discard = discard.sort(Tiles.valueFunction);
    while(tileTypes.length>0) {
      t = tileTypes.length;
      bin = [];
      while(t-->0) {
        if(tileTypes[t]===match) {
          bin.push(permutable[t]);
          permutable.splice(t,1);
          tileTypes.splice(t);
        }
      }
      discard = discard.concat(bin.sort(Tiles.valueFunction));
      match *= 2;
      // NOTE: we can do this ONLY because the Constants.js file
      //       declares the set types as powers of two!
    }

    // FIXME: remove anything that is in our "required" list from the discards.
    //        this should not be necessary, so it's an indication that the current
    //        generator code is deficient.
    partials.required.forEach(function(v) {
      var pos = discard.indexOf(v);
      while(pos !== -1) {
        discard.splice(pos,1);
        pos = discard.indexOf(v);
      }});

    // return the play-strategy information
    return {discard: discard, required: partials.required, role: partials.role};
  },

  // This function determines whether certain tiles are
  // required to fill certain sets based on in-hand tiles.
  fulfill: function(idx, permutable, tileTypes) {
    var required = [], role = [];
        permutable = permutable.slice();

    var tileNumber = permutable.splice(idx, 1)[0],
        tileSuit = Tiles.getTileSuit(tileNumber);
        tileTypes = tileTypes.slice();
    var tileType = tileTypes.splice(idx, 1)[0];

    var record = function(tileNumber, tileType) {
      required.push(tileNumber);
      role.push(tileType);
    };

    //console.log(tileNumber + "("+ tileType +")", permutable);

    var req, prev, next, psuit, nsuit;

    if (tileType === Constants.PAIR) {
      //console.log(tileNumber+": pair - requires "+tileNumber+" to form a pung");
      record(tileNumber, tileType);
    }
    else if (tileType === Constants.PUNG) {
      //console.log(tileNumber+": pair - requires "+tileNumber+" to form a kong");
      record(tileNumber, tileType);
    }
    else if (tileType === Constants.CONNECTED) {
      prev = tileNumber - 1;
      psuit = Tiles.getTileSuit(prev);
      if(permutable.indexOf(prev)!==-1 && psuit === tileSuit) {
        req = tileNumber - 2;
        // make sure this tile is legal
        if (Tiles.getTileSuit(req) === tileSuit) {
          record(req, tileType);
        }
      }

      next = tileNumber + 1;
      nsuit = Tiles.getTileSuit(next);
      if(permutable.indexOf(next)!==-1 && nsuit === tileSuit) {
        req = tileNumber + 2;
        // make sure this tile is legal
        if (Tiles.getTileSuit(req) === tileSuit) {
          record(req, tileType);
        }
      }
    }
    else if (tileType === Constants.GAPPED) {
      // which side?
      prev = tileNumber - 2;
      psuit = Tiles.getTileSuit(prev);
      if(permutable.indexOf(prev)!==-1 && psuit === tileSuit) {
        req = tileNumber - 1;
        // automatically legal
        record(req, tileType);
      }

      next = tileNumber + 2;
      nsuit = Tiles.getTileSuit(next);
      if(permutable.indexOf(next)!==-1 && nsuit === tileSuit) {
        req = tileNumber + 1;
        // automatically legal
        record(req, tileType);
      }
    }
    else {
      //console.log("already a set");
    }

    return {required: required, role: role};
  }
};
