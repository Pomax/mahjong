var uid = require('../uid');
var logger = require('../logger');

var Listener = require('./protocol/listener');
var Emitter = require('./protocol/emitter');

var Game = require('./game');
var rulesets = require('./rulesets');

var GameManager = function() {
  this.games = {};
  this.gamesListeners = [];
  this.log = logger('manager');
};

GameManager.prototype = {
  nextPlayerId: uid(),
  nextGameId: uid(),

  reset() {
    this.log('\033[2J'); // clear the terminal
    this.log("resetting game manager");
    // notify in-game clients
    Object.keys(this.games).forEach(k => this.games[k].reset());
    this.games = {};
    // notify in-lobby clients
    this.gamesListeners.forEach(socket => {
      if (socket.connected) {
        socket.emit("server:reset", { games });
      }
    });
    this.gamesListeners = [];
  },

  getGame(id, name, rulesetName) {
    id = parseInt(id);
    if (!this.games[id]) {
      name = name || "game "+id;
      rulesetName = rulesetName || Object.keys(rulesets)[0];
      var ruleset = new rulesets[rulesetName]();
      ruleset.name = rulesetName;
      this.games[id] = new Game(this, name, ruleset, id);
    }
    return this.games[id];
  },

  manageConnection(socket) {
    this.listenFor(socket);
    socket.emit('connected');
    this.notifyGameListUpdate();
  },

  listenFor(socket) {
    // register player as listening for available game information
    socket.on('sendgames', data => this.addGamesListener(socket));
    // player actions outside of playing games
    socket.on('newgame', data => this.makeNewGame(socket, data));
    socket.on('joingame', data => this.joinPlayerToGame(socket, data));
    socket.on('leavegame', data => this.removePlayerFromGame(socket, data));
    // always good to handle:
    socket.on('disconnect', data => this.disconnectPlayer(socket, data));
  },

  disconnectPlayer(socket, data) {
    // for now, treat the player as "gone".
    this.log("socket disconnected...");
    var keys = Object.keys(this.games);
    keys.forEach(g => {
      var game = this.games[g];
      if (!game) return;
      game.handleDisconnect(socket)
    });
    this.removeGamesListener(socket);
    this.notifyGameListUpdate();
  },

  joinPlayerToGame(socket, data) {
    var playerid = data.playerid || this.nextPlayerId();
    var playername = data.playername || "player" + playerid;
    var gameid = data.gameid;
    var game = this.getGame(gameid);
    game.addPlayer(playerid, playername, socket);
    socket.emit("joinedgame", { gameid, playerid });
    this.notifyGameListUpdate();
    // Should we start this game?
    if (game.players.length === 4) { game.readyGame(); }
  },

  removePlayerFromGame(socket, data) {
    var gameid = data.gameid;
    var playerid = data.playerid;
    var game = this.getGame(gameid);
    game.removePlayer(playerid);
    if (!game.players.length) {
      game.remove();
      this.games[gameid] = false;
    }
    socket.emit("leftgame", { gameid, playerid });
    this.notifyGameListUpdate();
  },

  addGamesListener(socket) {
    this.gamesListeners.push(socket);
    this.notifyGameListUpdate(socket);
  },

  removeGamesListener(socket) {
    var pos = this.gamesListeners.indexOf(socket);
    if (pos > -1) {
      this.gamesListeners.splice(pos, 1);
    } else {
      console.error("was asked to unregister a socket that was not know to be registered...");
    }
  },

  makeNewGame(socket, data) {
    var gameid = this.nextGameId();
    this.getGame(gameid, data.name, data.ruleset);
    socket.emit("madegame", { gameid });
  },

  /**
   * Send available game information to one, or all,
   * registered sockets (=players). This happens
   * whenever a game is joined or left by players.
   */
  notifyGameListUpdate(specific) {
    var games = {};
    Object.keys(this.games).forEach(gameid => {
      var g = this.games[gameid];
      if (!g) return
      if(g.players.length) {
        games[gameid] = {
          name: g.name,
          ruleset: g.ruleset.name,
          players: g.players.map(p => p.name)
        };
      }
      // clean up all games without players
      else {
        g.remove();
        this.games[gameid] = false;
      }
    });
    // who do we send the list to?
    var list = specific ? [specific] : this.gamesListeners;
    list.forEach((socket,sid) => {
      if (socket.connected) {
        socket.emit("gamelist", { games });
      } else {
        this.removeGamesListener(socket);
      }
    });
  }
};

module.exports = new GameManager();
