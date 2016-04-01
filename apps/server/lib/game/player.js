var logger = require('../logger');

var Player = function(game, id, socket) {
  this.game = game;
  this.id = id;
  this.socket = socket;
  console.log("created new player with id " + id)
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
   * player discards this tile
   */
  discard: function(tile) {
    this.send("discard", {
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
    this.send("compensation", {
      tiles: tiles
    });
  }

};

module.exports = Player;
