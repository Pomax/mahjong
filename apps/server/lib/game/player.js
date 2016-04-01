var logger = require('../logger');
var Constants = require('../constants');

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
    this.log("received tiles",tiles);
    this.send("sethand", {
      playerid: this.id,
      game: this.game.id,
      hand: this.hand.id,
      tiles: tiles
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
   * another player discards this tile
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
    this.send("compensation", {
      tiles: tiles
    });
  },

  /**
   * Can this player claim the tile they want to claim for the purpose they indicated?
   */
  canClaim: function(tile, claimType) {
    // FIXME: TODO: implement non-pung claims
    if (claimType !== Constants.PUNG) return

    this.log("tile:",tile,"tiles:", this.tiles);

    // for now, let's see if we can honour pungs
    var instances=0;
    this.tiles.forEach((t,idx) => {
      if(t===tile) instances++;
    });

    this.log(instances,"instances of",tile,"found");

    // 1=pair, 2=pung, 3=kong
    if (instances >= 2) {
      return true;
    }
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
    // FIXME: TODO: implement non-pung claims
    if (claimType !== Constants.PUNG) return

    // remove tile from hand twice and form set.
    for(var i=0; i<2; i++) {
      this.tiles.splice(this.tiles.indexOf(tile),1);
    }
    this.revealed.push([tile, tile, tile]);
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
  }
};

module.exports = Player;
