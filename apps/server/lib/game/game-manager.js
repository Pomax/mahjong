var uid = require('../uid');
var logger = require('../logger');

var Listener = require('./protocol/listener');
var Emitter = require('./protocol/emitter');

var Game = require('./game');
var Ruleset = require('./rulesets/minimal');

var GameManager = function() {
  this.games = {};
  this.gamesListeners = [];
  this.log = logger('manager');
};

GameManager.prototype = {
  reset: function() {
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
    /*
      var playerid = this.nextPlayerId();
      this.log("creating connection for client.","playerid:" + playerid);

      var securities = { playerid };
      this.mustMatch = Object.keys(securities);
      this.listenFor = new Listener(socket, securities);
      this.notify = new Emitter(socket, securities);

      // set up listening for this client's request to join a game
      this.listenFor.join(this);

      // notify the client that they are connected
      this.notify.connected(playerid);
    */
    console.log("making connection with client");

    socket.on('listen:games', data => this.addGamesListener(socket, data));
    socket.on('listen:stop', data => this.removeGamesListener(socket, data));
    socket.on('newgame:request', data => this.makeNewGame(socket, data));
    socket.on('player:register', data => this.registerPlayer(socket, data));
    socket.on('disconnect', data => this.disconnectPlayer(socket, data));

    console.log("emitting 'connected'");
    socket.emit('connected');
    this.notifyGameListUpdate();
  },

  disconnectPlayer(socket, data) {
    // for now, treat the player as "gone".
    this.log("socket disconencted...");
    var keys = Object.keys(this.games);
    keys.forEach(g => {
      var game = this.games[g];
      if (!game) return;
      game.handleDisconnect(socket)
    });
    this.notifyGameListUpdate();
  },

  registerPlayer(socket, data) {
    // FIXME: TODO: add in playerid security, obviously
    var playerid = data.playerid || this.nextPlayerId();
    var gameid = data.gameid;
    this.getGame(gameid).addPlayer(playerid, socket);
    socket.emit("player:registered", { gameid, playerid });
    this.notifyGameListUpdate();
  },

  notifyGameListUpdate(specific) {
    var games = {};
    Object.keys(this.games).forEach(gameid => {
      var g = this.games[gameid];
      if (!g) return
      var cnt = g.getPlayerCount();
      if(cnt>0) {
        games[gameid] = cnt;
      } else {
        g.remove();
        this.games[gameid] = false;
      }
    });
    var list = specific ? [specific] : this.gamesListeners;
    list.forEach(socket => {
      console.log("sending gameslist to socket", games);
      if (socket.connected) {
        socket.emit("gameslist", { games });
      }
    });
  },

  addGamesListener(socket, data) {
    console.log("added socket to gameslist listeners");
    this.gamesListeners.push(socket);
    this.notifyGameListUpdate(socket);
  },

  removeGamesListener(socket, data) {
    var pos = this.gamesListeners.indexOf(socket);
    console.log("removing socket "+pos+" from gameslist listeners");
    this.gamesListeners.splice(pos, 1);
  },

  makeNewGame(socket, data) {
    console.log("making new game for a client");
    gameid = this.nextGameId();
    this.getGame(gameid);
    socket.emit("newgame:made", { gameid });
  }
};

module.exports = new GameManager();
