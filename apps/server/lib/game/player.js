var logger = require('../logger');
var Constants = require('../constants');
var Tiles = require('./tiles');

var Player = function(game, id, socket) {
  this.game = game;
  this.id = id;
  this.socket = socket;
  this.tiles = [];
  this.revealed = [];
  this.log = logger('game', game.id, 'player', id);
  this.log("created");
};

Player.prototype = {
  /**
   * socket.io interfacing
   */
  send: function(str, data) {
    this.socket.emit(str, data);
  },

  reset: function() {
    this.socket.disconnect();
  },

  /**
   * when a hand starts, everything resets.
   */
  startHand: function(hand) {
    this.hand = hand;
    this.send("ready", {
      playerid: this.id,
      game: this.game.id,
      hand: this.hand.id
    });
  },

  /**
   * initial hand deal (usuall 13 tiles)
   */
  setHand: function(tiles) {
    this.tiles = tiles;
    this.log("received tiles", tiles);
    this.send("sethand", {
      playerid: this.id,
      game: this.game.id,
      hand: this.hand.id,
      tiles: this.tiles
    });
  },

  /**
   * the current hand was drawn.
   */
  drawOccured: function() {
    this.send("finish:draw")
  },

  /**
   * game deals a tile to this player
   */
  deal: function(tile) {
    this.tiles.push(tile);
    this.tiles.sort();
    this.send("tile", {
      playerid: this.id,
      gameid: this.game.id,
      handid: this.hand.id,
      tile: tile
    });
  },

  /**
   * game notification that another player drew a tile
   */
  drew: function(cpos) {
    this.send("drew", {
      playerid: this.id,
      gameid: this.game.id,
      handid: this.id,
      player: cpos
    });
  },

  /**
   * this player discarded
   */
  discard: function(tile) {
    this.tiles.splice(this.tiles.indexOf(tile),1);
  },

  /**
   * game notification that another player discards this tile
   */
  discarded: function(pos, tile) {
    this.send("discard", {
      playerpos: pos,
      playerid: this.id,
      gameid: this.game.id,
      handid: this.hand.id,
      tile: tile
    });
  },

  /**
   * request compensation tiles for bonus tiles
   */
  getCompensation: function(tiles) {
    tiles.forEach(tile => this.tiles.push(tile));
    this.tiles.sort();
    this.send("compensation", {
      tiles: tiles
    });
  },

  /**
   * game notification that another player received a compensation tile for a bonus tiles
   */
  gotCompensation: function(pos, tiles) {
    tiles = tiles.filter(t => t>=Constants.BONUS);
    this.send("compensated", { pos, tiles });
  },

  /**
   * Can this player claim the tile they want to claim for the purpose they indicated?
   */
  canClaim: function(tile, claimType, winType) {
    this.log("can claim tile:",tile,"? tiles:", this.tiles);

    if (claimType <= Constants.CHOW3) { return this.canClaimChow(tile, claimType); }
    if (claimType === Constants.PUNG) { return this.canClaimSet(tile, 2); }
    if (claimType === Constants.KONG) { return this.canClaimSet(tile, 3); }
    if (claimType === Constants.WIN)  { return this.canClaimWin(tile, winType); }
    return false
  },

  /**
   * check if this player can form a set of size inhandcount+1 given
   * the tiles that they currently hold.
   */
  canClaimSet: function(tile, inhandcount) {
    var instances=0;
    this.tiles.forEach((t,idx) => {
      if(t===tile) instances++;
    });
    this.log(instances,"instances of",tile,"found");

    // 1=pair, 2=pung, 3=kong
    if (instances >= inhandcount) {
      return true;
    }
  },

  /**
   * check if this player can form a chow with the indicted tile
   * given the tiles that they currently hold.
   */
  canClaimChow: function(tile, claimType) {
    var suit = Tiles.getTileSuit(tile);
    if (suit >= Constants.HONOURS) return false;

    // check for connecting tiles in the same suit
    var fullsuit = Tiles.getSuitTiles(suit);
    var tpos = fullsuit.indexOf(tile);
    var tiles = this.tiles;
    if (claimType === Constants.CHOW1) {
      this.log("chow1 with tpos",tpos,"in suit",suit,"tiles",tiles);
      return tpos+2<Constants.NUMMOD && tiles.indexOf(tile+1)>-1 && tiles.indexOf(tile+2)>-1;
    }
    if (claimType === Constants.CHOW2) {
      this.log("chow2 with tpos",tpos,"in suit",suit,"tiles",tiles);
      return tpos>0 && tpos+1<Constants.NUMMOD && tiles.indexOf(tile-1)>-1 && tiles.indexOf(tile+1)>-1;
    }
    if (claimType === Constants.CHOW3) {
      this.log("chow3 with tpos",tpos,"in suit",suit,"tiles",tiles);
      return tpos>1 && tiles.indexOf(tile-1)>-1 && tiles.indexOf(tile-2)>-1;
    }
  },

  /**
   * This is a complicated function, and is highly ruleset dependent.
   */
  canClaimWin: function(tile, winType) {
    // FIXME: TODO: implement properly based on rulesets.

    // 1. can we claim this thing, outside of winning?
    var claimable = this.canClaim(tile, winType);

    // 2. if so, what's left after we resolve that claim?
    var remainder = [];

    // 3. Can we form any sort of winning pattern with those tiles?
    var covers = this.checkCoverage(remainder,setsNeeder,pairNeeded);

    // if we can, this is a legal win claim.
    return covers;
  },

  /**
   * A declined claim is mostly a matter of notification, no action is requied.
   */
  declineClaim: function(tile, claimType) {
    this.socket.emit("declined", {
      playerid: this.id,
      tile: tile,
      claimType: claimType
    });
  },

  /**
   * An accepted claim will lead to splitting up the tiles into a revealed
   * set, and the remaining tiles still in hand.
   */
  acceptClaim: function(tile, claimType) {
    this.processClaim(tile, claimType);
    this.socket.emit("accepted", {
      playerid: this.id,
      tile: tile,
      claimType: claimType
    });
  },

  /**
   * Determine which tiles to form a set with.
   */
  processClaim: function(tile, claimType) {
    if (claimType === Constants.WIN) return

    var set = [];
    if (claimType === Constants.CHOW1) { set = this.formChow(tile, claimType); }
    if (claimType === Constants.CHOW2) { set = this.formChow(tile, claimType); }
    if (claimType === Constants.CHOW3) { set = this.formChow(tile, claimType); }
    if (claimType === Constants.PUNG) { set = this.formSet(tile, 3); }
    if (claimType === Constants.KONG) { set = this.formSet(tile, 4); }
    this.log("set:", set);

    // remove tile from hand twice and form set.
    set.forEach(tile => this.tiles.splice(this.tiles.indexOf(tile),1));

    // add the set to our revealed bank
    this.revealed.push(set);
  },

  // utility function
  formChow: function(tile, chowtype) {
    if (chowtype === Constants.CHOW1) return [tile, tile+1, tile+2];
    if (chowtype === Constants.CHOW2) return [tile-1, tile, tile+1];
    if (chowtype === Constants.CHOW3) return [tile-2, tile-1, tile];
  },

  // utility function
  formSet: function(tile, howmany) {
    var set = [];
    while(howmany--) { set.push(tile); }
    return set;
  },

  /**
   * another player claimed the discard
   */
  claimOccurred: function(pos, tile, claimType) {
    this.socket.emit("claimed", {
      player: pos,
      tile: tile,
      claimType: claimType
    });
  },

  /**
   * Someone won this round.
   */
  winOccurred: function(pos, tile) {
    this.socket.emit("finish:win", {
      player: pos,
      tile: tile
    });
  }
};

module.exports = Player;
