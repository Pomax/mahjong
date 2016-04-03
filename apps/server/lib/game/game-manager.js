var uid = require('../uid');
var logger = require('../logger');

var Listener = require('./protocol/listener');
var Emitter = require('./protocol/emitter');

var Game = require('./game');
var Ruleset = require('./rulesets/minimal');

var GameManager = function() {
  this.games = {};
  this.log = logger('manager');
};

GameManager.prototype = {
  reset: function() {
    this.log('\033[2J'); // clear the terminal
    this.log("resetting game manager");
    Object.keys(this.games).forEach(k => this.games[k].reset());
    this.games = {};
  },

  nextPlayerId: uid(),

  nextGameId: uid(),

  getGame: function(id) {
    id = parseInt(id);
    // FIXME: TODO: we'll need to figure out a good way to change rulesets
    if (!this.games[id]) {
      this.games[id] = new Game(this, new Ruleset(), id);
    }
    return this.games[id];
  },

  manageConnection: function(socket) {
    var playerid = this.nextPlayerId();
    this.log("creating connection for client.","playerid:" + playerid);

    var securities = {playerid};
    this.mustMatch = Object.keys(securities);
    this.listenFor = new Listener(socket, securities);
    this.notify = new Emitter(socket, securities);

    // set up listening for this client's request to join a game
    this.listenFor.join(this);

    // and then notify the client that they are connected
    this.notify.connected(playerid);
  },

  handleJoin: function(gameid, playerid, socket) {
    this.getGame(gameid).addPlayer(playerid, socket);
  }
};

module.exports = new GameManager();
