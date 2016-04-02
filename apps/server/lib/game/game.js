var logger = require('../logger');
var Constants = require('../constants');
var Player = require('./player');
var Hand = require('./hand');
var Wall = require('./wall');

var Game = function(manager, ruleset, id) {
  this.ruleset = ruleset;
  this.manager = manager;
  this.id = id;
  this.players = [];
  this.hands = [];
  this.log = logger('game', id);
  this.log("new game created");
};

Game.prototype = {
  reset: function() {
    this.players.forEach(player => player.reset());
    this.players = [];
    this.hands = [];
  },

  addPlayer: function(playerid, socket) {
    if (this.players.length === 4)
      return false;
    var player = new Player(this, playerid, socket);
    var pos = this.players.length;
    this.players.push(player);
    this.log("added player " + playerid);

    socket.emit("joined", {
      gameid: this.id,
      pos: pos
    });

    if (this.players.length === 4) {
      this.startGame();
    }
  },

  startGame: function() {
    this.log("starting game");
    var hand = new Hand(this, this.ruleset, this.hands.length, this.players);
    this.hands.push(hand);
    hand.start();
  }
};

module.exports = Game;
