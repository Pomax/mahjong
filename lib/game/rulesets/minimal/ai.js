var logger = require('../../../logger');
var Constants = require('../../constants');
var GameTracker = require('../../game-tracker');

var AI = function(client) {
  this.tracker = new GameTracker();
  this.log = logger(client.state.playername);

  // expose the client's tilebank as a local property
  Object.defineProperty(this, "tiles", {
    get: () => client.state.tiles.slice()
  });

  Object.defineProperty(this, "onNextHand", {
    get: () => client.props ? client.props.onNextHand : false
  });
};

AI.prototype = {

  // Update strategy based on someone discarding
  updateStrategy(discardTile) {
    if (discardTile !== undefined) {
      this.updateStrategyNaively();
    }

    // update strategy based on our own hand
    else {
      this.updateStrategyNaively();
    }

    var text = [];
    Object.keys(this.required).forEach(k => {
      text.push(k + " (" + this.required[k].claimType + ")");
    });
//    this.log("required:\n", "  ", text.join(', '));
  },

  // Do we want to lay claim to a discard?
  determineClaim(tile, playerposition) {
    this.updateStrategy(tile);
    var nothing = Constants.NOTILE;
    if (this.required[tile]) {
      return {
        tile: tile,
        claimType: this.required[tile].claimType,
        winType: this.required[tile].winType || nothing
      };
    }
    return { tile: nothing, claimType: nothing, winType: nothing };
  },

  // What do we discard?
  determineDiscard() {
    return this.determineDiscardNaively();
  },

  // ============================================================


  /**
   * A silly strategy: all pung hand, all the time,
   * without any prioritisation of which tile to
   * throw away based on probabilities and scores.
   */
  updateStrategyNaively() {
    // do we only have a single tile? If so, we want another one of those.
    if (this.tiles.length === 1) {
      var tile = this.tiles[0];
      this.required = {};
      this.required[tile] = {
        probability: this.tracker.getProbability(tile),
        claimType: Constants.WIN,
        winType: Constants.PAIR
      };
      return;
    }

    // if not, let's get some pungs
    var counts = [];
    this.tiles.forEach(tile => {
      if(!counts[tile]) counts[tile]=0;
      counts[tile]++;
    });

    var required = {};
    counts.forEach((count, tile) => {
      if(count>1) {
        var probability = this.tracker.getProbability(tile);
        if (probability > 0) {
          required[tile] = {
            claimType: this.getClaimTypeFor(tile, count),
            probability: probability
          };
        }
      }
    });

    this.required = required;
  },

  /**
   * Given that we're a simple, pung-hungry AI player,
   * we really only care about whether we can form a
   * pung or a kong. We'll always prefer the latter.
   */
  getClaimTypeFor(tile, count) {
    if (count === 2) return Constants.PUNG;
    if (count === 3) return Constants.KONG;
    console.error("count for "+tile+" is < 2...?", " ("+count+") ", this.tiles);
  },

  /**
   * Just throw out anything that we don't require. Since we
   * only require things for pungs, the "require" list is
   * also our "do not discard" list.
   */
  determineDiscardNaively() {
//    this.log(this.tiles);

    if (this.tiles.length === 0) {
      return Constants.NOTILE;
    }

    // do we only have two tiles, and are they the same? we win!
    if (this.tiles.length === 2 && this.tiles[0] === this.tiles[1]) {
      return Constants.NOTILE;
    }

    // We've not won... throw out any tile we don't need.
    var discards = this.tiles.slice().filter(tile => !this.required[tile]);
    var discard;

    if (discards.length > 0) {
      discard = (Math.random() * discards.length)|0;
      return discards[discard];
    }

    // we're going to have to throw something we can use for a pung.
    // for now, any will do, but FIXME: TODO: pick the tile with lowest
    // prodbability to get.
    discard = (Math.random() * this.tiles.length)|0;
    return this.tiles[discard];
  }
};

module.exports = AI;
