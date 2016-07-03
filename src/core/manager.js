'use strict';

class UID {
  constructor() { this.id = 1; }
  next() { return this.id++; }
};

var Player = require('./player');
var playerids = new UID();

var Game = require('./game');
var gameids = new UID();

/**
 * The game manager is the broken for individual games,
 * as well as administering individual player backings.
 */
class Manager {
  constructor() {
    this.players = {};
    this.games = {};
  }

  // Player administration

  createPlayer(options, sendConnectionInformation) {
    var player;

    // preexisting player?
    if (options.uuid) {
      player = this.getPlayerByUUID(options.uuid);
      if (player) {
        console.log("new player is actually existing player:", options);

        // TODO: either reconnect or build new socket.

//        player.setupConnectorAgain(() => {
//          console.log("sending connection information to ", options.name);
//          sendConnectionInformation(player.id, player.uuid, player.connector.port, player);
//        });
//        player.sendGamelistUpdate(this.getGameList());
//        return player;
      }
    }

    // new player
    options.name = options.name || 'player ${options.id}';
    var playerid = playerids.next();
    options.id = playerid;
    player = new Player(this, options, sendConnectionInformation);
    this.players[playerid] = player;
    player.sendGamelistUpdate(this.getGameList());
    return this.players[playerid];
  }

  getPlayer(id) {
    return this.players[id];
  }

  getPlayerByUUID(uuid) {
    var ids = Object.keys(this.players);
    for(var i=0; i<ids.length; i++) {
      let id = ids[i];
      if (this.players[id].uuid === uuid) {
        return this.players[id];
      }
    }
    return false;
  }

  removePlayer(id) {
    this.players[id] = false;
    delete this.players[id];
  }

  getPlayerList() {
    return this.players;
  }

  // Game administration

  createGame(rulesetName) {
    var gameid = gameids.next();
    this.games[gameid] = new Game(this, gameid, rulesetName);
    return this.games[gameid];
  }

  getGame(gameid) {
    return this.games[gameid];
  }

  removeGame(gameid) {
    this.games[gameid] = false;
    delete this.games[gameid];
  }

  getGameList() {
    return this.games;
  }

  // Player _and_ game functions

  joinPlayerToGame(gameid, playerid, uuid) {
    var game = this.getGame(gameid);
    var player = this.getPlayer(playerid);
    try {
      game.addPlayer(player);
      this.sendGamelistUpdate();
      return true;
    } catch (e) {}
    return false;
  }

  getGameList() {
    var gamelist = {};
    Object.keys(this.games).map(gameid => {
      gamelist[gameid] = this.games[gameid].getPlayerNames();
    });
    return gamelist;
  }

  sendGamelistUpdate() {
    var gamelist = this.getGameList();
    Object.keys(this.players).forEach(id => {
      let player = this.players[id];
      player.sendGamelistUpdate(gamelist);
    });
  }

  // General purpose

  valueOf() {
    return this;
  }

  toString() {
    return '';
  }
};

module.exports = Manager;
