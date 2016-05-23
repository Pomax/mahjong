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

  createPlayer(options, sendPortInformation) {
    var playerid = playerids.next();
    options.id = playerid;
    options.name = options.name || 'player ${options.id}';
    this.players[playerid] = new Player(this, options, sendPortInformation);
    return this.players[playerid];
  }

  getPlayer(id) {
    return this.players[id];
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

  joinPlayerToGame(playerid, gameid) {

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
