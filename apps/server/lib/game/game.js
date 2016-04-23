var logger = require('../../../../lib/logger');
var Constants = require('../../../../lib/constants');

var Listener = require('./protocol/listener');
var Emitter = require('./protocol/emitter');

var Player = require('./player');
var Hand = require('./hand');
var Wall = require('./wall');

var Game = function(manager, name, ruleset, id) {
  this.manager = manager;
  this.name = name;
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

  addBot: function(botid) {
    // set up a new player for this client.
    var gameid = this.id;
    var playerposition = this.players.length;
    var AI = this.ruleset.getAI();
    var player = new AI(this, botid);
    player.isBot = true;
    this.players.push(player);
    this.log("added bot " + botid);
  },

  addPlayer: function(playerid, playername, socket) {
    // do not accept more than four players for any game
    if (this.players.length === 4) {
      return false;
      // FIXME: TODO: allow players to join as spectator?
    }

    // set up a new player for this client.
    var gameid = this.id;
    var playerposition = this.players.length;
    var player = new Player(this, playerid, playername, socket);
    this.players.push(player);
    this.log("added player " + playerid);

    // set up protocol listener and emitter, with known security values
    var securities = {gameid, playerid, playerposition};
    var notify = new Emitter(socket, securities);

    // let the player know they joined a particular game.
    notify.joined(gameid, playerid, playerposition);
  },

  removePlayer: function(playerid) {
    // FIXME: TODO: this can leave players lingering in a game??
    var pos = -1;
    this.players.some((p,_pos) => {
      if (p.id === playerid) {
        pos = _pos;
      }
    });
    if (pos > -1) {
      this.players.splice(pos,1);
    }
  },

  handleDisconnect: function(socket) {
    var pid = -1;
    for(var i=0, p; i<this.players.length; i++) {
      p = this.players[i];
      if (p.socket === socket) {
        p.setDisconnected();
        this.players.splice(i,1);
        return true;
      }
    }
    return false;
  },

  getPlayerCount: function() {
    return this.players.length;
  },

  readyGame: function() {
    this.log("readying game");
    var hand = new Hand(this, this.ruleset, this.hands.length, this.players);
    this.hands.push(hand);
    this.readies = 0;
    this.players.forEach(player => {
      if (player.isBot) {
        // bots are automatically ready to play
        return this.ready(player);
      }
      player.socket.emit("readygame", {
        gameid: this.id,
        playerid: player.id,
        players: this.players.map(p => p.name)
      });
      player.socket.on("readygame", data => this.ready(player) );
    });
  },

  ready: function(player) {
    this.readies++;
    if (!player.isBot) {
      player.socket.removeAllListeners("readygame");
    }
    if(this.readies < this.players.length) return;
    this.startGame();
  },

  startGame: function() {
    this.log("starting game");
    this.hands.slice(-1)[0].start();
  },

  remove: function() {
    // kill off this game
    this.log("removing game "+this.id);
  }
};

module.exports = Game;
