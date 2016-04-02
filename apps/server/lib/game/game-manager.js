var Game = require('./game');
var logger = require('../logger');
var uid = require('../uid');

var GameManager = function() {
  this.games = {};
  this.log = logger('manager');
};

GameManager.prototype = {
  nextPlayerId: uid(),

  nextGameId: uid(),

  getGame: function(id) {
    if (!this.games[id]) {
      this.games[id] = new Game(this, id);
    }
    return this.games[id];
  },

  reset: function() {
    this.log("resetting game manager");
    Object.keys(this.games).forEach(k => this.games[k].reset());
    this.games = {};
  }
};

module.exports = new GameManager();
