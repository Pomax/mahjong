var logger = require('../logger');
var Constants = require('../constants');

var Listener = require('./protocol/listener');
var Emitter = require('./protocol/emitter');

var Player = require('./player');
var Hand = require('./hand');
var Wall = require('./wall');

var Game = function(manager, ruleset, id) {
  this.manager = manager;
  this.ruleset = ruleset;
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
    // do not accept more than four players for any game
    if (this.players.length === 4) {
      return false;
      // FIXME: TODO: allow players to join as spectator?
    }

    // set up a new player for this client.
    var gameid = this.id;
    var playerposition = this.players.length;
    var player = new Player(this, playerid, socket);
    this.players.push(player);
    this.log("added player " + playerid);

    // set up protocol listener and emitter, with known security values
    var securities = {gameid, playerid, playerposition};
    this.listenFor = new Listener(socket, securities);
    this.notify = new Emitter(socket, securities);

    // let the player know they joined a particular game.
    this.notify.joined(gameid, playerid, playerposition);

    // when four players have joined a game, start that game.
    if (this.players.length === 4) { this.startGame(); }
  },

  getPlayerCount: function() {
    return this.players.length;
  },

  startGame: function() {
    this.log("starting game");
    var hand = new Hand(this, this.ruleset, this.hands.length, this.players);
    this.hands.push(hand);
    hand.start();
  }
};

module.exports = Game;
