var Game = require('./game');
var logger = require('../logger');
var uid = require('../uid');
var Ruleset = require('./rulesets/minimal');

var GameManager = function() {
  this.games = {};
  this.log = logger('manager');
};

GameManager.prototype = {
  nextPlayerId: uid(),

  nextGameId: uid(),

  getGame: function(id) {
    if (!this.games[id]) {
      this.games[id] = new Game(this, new Ruleset(), id);
    }
    return this.games[id];
  },

  reset: function() {
    this.log('\033[2J'); // clear the terminal
    this.log("resetting game manager");
    Object.keys(this.games).forEach(k => this.games[k].reset());
    this.games = {};
  }
};

module.exports = new GameManager();
