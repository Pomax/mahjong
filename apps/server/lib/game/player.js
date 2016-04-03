var logger = require('../logger');
var Constants = require('../constants');
var md5 = require('md5');

var Player = function(game, id, socket) {
  this.game = game;
  this.id = id;
  this.socket = socket;
  this.tiles = [];
  this.bonus = [];
  this.revealed = [];
  this.log = logger('game', game.id, 'player', id);
  this.log("created");

  // listen for verification requests
  this.socket.on("verify", this.verify.bind(this));
};

Player.prototype = {

  /**
   * socket.io interfacing
   */
  send(str, data) {
    this.socket.emit(str, data);
  },

  /**
   * Reset this player.
   */
  reset() {
    this.socket.disconnect();
  },

  /**
   * Generate a hash based on this player's tiles, bonus tiles, and revealed tiles.
   */
  getDigest() {
    var list = this.tiles.concat(this.bonus);
    this.revealed.forEach(set => { list = list.concat(set); });
    return md5(list.sort().join(''));
  },

  /**
   * Verify a client's tile state, because we want to make sure that
   * the remove and local models match. If they don't, something,
   * somewhere, went wrong and that's either a bug, an unaccounted-for
   * synchronisation error, or a intentional remote subversion.
   */
  verify(data) {
    this.log("verify called");
    var passed = true;
    if (this.id !== data.playerid) {
      this.log("local id:",this.id,", remote id:",data.playerid);
      passed = false;
    }
    var digest = this.getDigest();
    if (digest !== data.digest) {
      this.log("local digest:",digest,", remote id:",data.digest);
      this.log("local:",this.tiles,this.bonus,this.revealed);
      this.log("remote:",data.tiles,data.bonus,data.revealed);
      passed = false;
    }
    this.send("verification", { result: passed });
  },

  /**
   * When a hand starts, everything resets.
   */
  startHand(hand, playerposition) {
    this.hand = hand;
    this.send("ready", {
      playerposition: playerposition,
      playerid: this.id,
      game: this.game.id,
      hand: this.hand.id
    });
  },

  /**
   * initial hand deal (usuall 13 tiles).
   */
  setHand(tiles) {
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
   * game dealt X tiles to the indicated player.
   */
  dealtTiles(playerposition, tileCount) {
    this.send("dealt", { playerposition, tileCount });
  },

  /**
   * the current hand was drawn.
   */
  drawOccured() {
    this.send("finish:draw")
  },

  /**
   * game deals a tile to this player.
   */
  deal(tile) {
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
   * Game notification that another player drew a tile.
   */
  drew(playerposition) {
    this.send("drew", {
      playerid: this.id,
      gameid: this.game.id,
      handid: this.id,
      playerposition: playerposition
    });
  },

  /**
   * this player discarded
   */
  discard(tile) {
    this.tiles.splice(this.tiles.indexOf(tile),1);
  },

  /**
   * Game notification that another player discards this tile.
   */
  discarded(pos, tile) {
    this.send("discard", {
      playerposition: pos,
      playerid: this.id,
      gameid: this.game.id,
      handid: this.hand.id,
      tile: tile
    });
  },

  /**
   * Game notification that a discarded tile was unclaimed and
   * has been moved to the (inaccessible) discard pile
   */
  unclaimed(tile) {
    this.send("unclaimed", {
      tile: tile
    });
  },

  /**
   * Receive compensation tiles for bonus tiles.
   */
  getCompensation(bonus, compensation) {
    compensation.forEach(tile => this.tiles.push(tile));
    bonus.forEach(tile => { this.bonus.push(tile); this.tiles.splice(this.tiles.indexOf(tile),1); });
    this.tiles.sort();
    this.send("compensation", { tiles: compensation });
  },

  /**
   * Receive compensation tile for a kong.
   */
  getKongCompensation(tile) {
    this.getCompensation([],[tile]);
  },

  /**
   * Game notification that another player received a compensation tile for a bonus tiles.
   */
  gotCompensation(playerposition, tiles) {
    tiles = tiles.filter(t => t>=Constants.BONUS);
    this.send("compensated", { playerposition, tiles });
  },

  /**
   * A declined claim is mostly a matter of notification, no action is requied.
   */
  declineClaim(tile, claimType) {
    this.send("declined", {
      playerid: this.id,
      tile: tile,
      claimType: claimType
    });
  },

  /**
   * An accepted claim will lead to splitting up the tiles into a revealed
   * set, and the remaining tiles still in hand.
   */
  acceptClaim(ruleset, tile, claimType, winType) {
    ruleset.processClaim(this, tile, claimType, winType);
    this.send("accepted", {
      playerid: this.id,
      tile: tile,
      claimType: claimType,
      winType: winType
    });
  },

  /**
   * Another player claimed the discard.
   */
  claimOccurred(pos, tile, claimType) {
    this.send("claimed", {
      player: pos,
      tile: tile,
      claimType: claimType
    });
  },


  /**
   * Another player revealed a set of tiles after claiming
   */
  revealedSet(pos, set) {
    this.send("revealed", {
      playerposition: pos,
      set: set
    });
  },

  /**
   * Someone won this round.
   */
  winOccurred(pos, tile, winType) {
    this.send("finish:win", {
      player: pos,
      tile: tile,
      winType: winType
    });
  }
};

module.exports = Player;
