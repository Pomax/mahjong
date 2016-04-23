var logger = require('../../../../../../lib/logger');
var Constants = require('../../../../../../lib/constants');

var AI = function(game, id) {
  this.game = game;
  this.id = id;
  this.name = "AI player " + id;
  this.log = logger(this.name);
};

AI.prototype = {

  // Quite a few functions do nothing, as they have no client backing
  reset() {},
  setDisconnected() {},
  reconnect() {},
  getDigest() {},
  verify() {},
  disallowKongDeclaration() {},
  allowWin() {},
  disallowWin() {},
  declineClaim() {},
  drawOccured() {},
  winOccurred() {},
  illegalWinOccurred() {},

  bindHand(hand, state) {
    this.hand = hand;
    this.playerposition = state.playerposition;
    this.tiles = [];
    this.bonus = [];
    this.revealed = [];
    this.winner = false;
    state.score = this.score;
    // notify hand AI player has finished setup
    hand.handleConfirmed(this.playerposition);
  },

  setHand(tiles) {
    this.tiles = tiles;
    // update tile knowledge
  },

  // game dealt X tiles to the indicated player.
  dealtTiles(playerposition, tileCount) {
    // update tile knowledge
    this.log(playerposition,"was dealt",tileCount,"tiles");
  },


  // game deals a tile to this player.
  deal(tile) {
    this.tiles.push(tile);
    this.tiles.sort();
  },

  // Game notification that another player drew a tile.
  drew(playerposition) {
    // update tile knowledge
  },

  determineDiscard() {
    // determine what kind of play is appropriate now
    return this.tiles[0];
  },

  doDiscard() {
    var discardTile = this.determineDiscard();
    // notify hand of AI player's discard, with a 500ms timeout to make it look like the AI "thought" about it
    setTimeout(() => {
      this.hand.handleDiscard(this.playerposition, discardTile);
    }, 500);
  },

  // AI discard was honoured
  discard(tile) {
    this.tiles.splice(this.tiles.indexOf(tile),1);
  },

  determineClaim(playerposition, tile) {
    // determine whether we need to claim this tile
    // (we should already know this based on our current
    // "want tiles" list).
    return {
      tile: Constants.NOTILE,
      claimType: Constants.NOTILE,
      winType: Constants.NOTILE
    };
  },

  // Game notification that another player discards this tile.
  discarded(playerposition, tile) {
    if (playerposition === this.playerposition) return;
    // update tile knowledge
    var claim = this.determineClaim(playerposition, tile);
    this.hand.handleClaim(this.playerid, this.playerposition, claim.tile, claim.claimType, claim.winType);
  },

  // Game notification that a discarded tile is now permanent
  unclaimed(tile) {
    // update tile knowledge
  },

  // Receive compensation tiles for bonus tiles.
  getCompensation(bonus, compensation) {
    compensation.forEach(tile => this.tiles.push(tile));
    bonus.forEach(tile => { this.bonus.push(tile); this.tiles.splice(this.tiles.indexOf(tile),1); });
    this.tiles.sort();
  },

  // Receive compensation tile for a kong.
  getKongCompensation(tile) {
    this.getCompensation([],[tile]);
  },

  // Game notification that another player received a compensation tile for a bonus tiles.
  gotCompensation(playerposition, tiles) {
    tiles = tiles.filter(t => t>=Constants.BONUS);
    // update tile knowledge
  },

  // An accepted claim will lead to splitting up the tiles into a revealed set, and the remaining tiles still in hand.
  acceptClaim(ruleset, tile, claimType, winType) {
    ruleset.processClaim(this, tile, claimType, winType);
  },

  // An accepted win may require we reveal the claimed pair/set
  awardWinningClaim(ruleset, tile, claimType, winType) {
    ruleset.awardWinningClaim(this, tile, claimType, winType);
  },

  // Another player claimed the discard.
  claimOccurred(playerposition, tile, claimType) {
    // update tile knowledge
  },

  // Another player revealed a set of tiles after claiming
  revealedSet(playerposition, revealed, concealed) {
    // update tile knowledge
  },

  // Adjust this player's score balance
  adjustBalance(balance) { this.score += balance.score; },

  // does AI player have a kong of [tile] in their hand?
  hasKong(tile) {
    var counter = {};
    this.tiles.forEach(t => counter[t] = (counter[t]||0) + 1);
    var kongs = Object.keys(counter).filter(c => counter[c]===4);
    return !!counter[tile];
  },

  allowKongDeclaration(ruleset, tile, compensation) {
    ruleset.processClaim(this, tile, Constants.CONCEALED_KONG, Constants.NOTILE);
    // update tile knowledge
  }
};

module.exports = AI;
