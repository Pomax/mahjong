'use strict'

var Constants = require('../../constants');
var GameTracker = require('../../gametracker');
var FSA = require('./fsa');
var determineRequirements = require('../../strategies/fastwin');

class AI {
  constructor(client) {
    this.tracker = new GameTracker();

    // expose the client's tilebank as a local property
    Object.defineProperty(this, "tiles", {
      get: () => client.tiles.map(v => parseInt(v))
    });

    // expose the client's number of sets revealed as a local property
    Object.defineProperty(this, "setsPlayed", {
      get: () => client.revealed.length
    });
  }

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
  }

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
  }

  // What do we discard?
  determineDiscard() {
    return this.determineDiscardNaively();
  }

  // ============================================================


  /**
   * A silly strategy: all pung hand, all the time,
   * without any prioritisation of which tile to
   * throw away based on probabilities and scores.
   */
  updateStrategyNaively() {
    this.required = {};

    // do we only have a single tile? If so, we want another one of those.
    if (this.tiles.length === 1) {
      var tile = this.tiles[0];
      this.required[tile] = {
        probability: this.tracker.getProbability(tile),
        claimType: Constants.WIN,
        winType: Constants.PAIR
      };
      return;
    }

    // We have more than one tile: run the logic that can determine which
    // tiles we need, and for what purposes, to get closer to winning.
    var checked = determineRequirements(this.tiles, this.tracker);
    Object.keys(checked).forEach(tile => {
      this.required[tile] = {
        claimType: Math.max.apply(Math, checked[tile]),
        probability: this.tracker.getProbability(tile)
      };
    });
  }

  /**
   * Just throw out anything that we don't require. Since we
   * only require things for pungs, the "require" list is
   * also our "do not discard" list.
   */
  determineDiscardNaively() {
    // first off: have we won?
    if (FSA.check(this.tiles, 1, this.setsPlayed)) {
      return Constants.NOTILE;
    }

    var discard = 0;

    // If we're still in this function, we've not won.
    // As such, throw out any tile that we don't require

    var discards = this.tiles.slice().filter(tile => !this.required[tile]);
    if (discards.length > 0) {
      discard = (Math.random() * discards.length)|0;
      return discards[discard];
    }

    // Of course, if everything in our hand is also marked
    // as required (a hand made up of pairs, for instance)
    // then discard whichever tile has the lowest draw
    // probability.

    var minProb = 1;
    var probabilities = this.tiles.map(tile => this.tracker.getProbability(tile));
    probabilities.forEach((p,i) => {if (p < minProb) { minProb = p; discard = i; }});
    return this.tiles[discard];
  }
};

module.exports = AI;
