'use strict';

var fs = require('fs');

var Constants = require('./constants');
var rulesets = require('./rules');
var Hand = require('./hand');

/**
 * A game is effectively a "hand manager".
 */
class Game {
  constructor(manager, id, rulesetName) {
    this.manager = manager;
    this.id = id;
    this.ruleset = rulesets[rulesetName];
    this.windOffset = 0;
    this.windOfTheRound = this.ruleset.getStartWind();
    this.players = {};
    this.playerCount = 0;
    this.scores = {};
    this.hands = [];
    this.draws = 0;
    this.wins = 0;
  }

  // Player administration

  addPlayer(player) {
    this.players[player.name] = player;
    this.playerCount++;
    this.scores[player.name] = 2000; // FIXME: TODO: this is specified by the ruleset
    if (Object.keys(this.players).length === 4) { this.start(); }
  }

  removePlayer(name) {
    this.players[name] = false;
    delete this.players[name];
  }

  getPlayerList() {
    return this.players;
  }

  // Hand administration

  createHand() {
    var players = Object.keys(this.players).map(name => this.players[name]);
    var hand = new Hand(this, this.hands.length, players, this.windOfTheRound, this.windOffset);
    this.hands.push(hand);
    return hand;
  }

  getHand(hand) {
    hand = hand || this.hands.length - 1;
    return this.hands[hand];
  }

  getHandList() {
    return this.hands;
  }

  // game administration

  start() {
    var hand = this.createHand();
    hand.start();
  }

  handWasDrawn() {
    // FIXME: TODO: code goes here
    //
    // - Rotate winds, if rules say that should happen.
    //     This really means rotating the players, as position [0] counts as East.
    // - Start a new hand.
    this.draws++;
    this.windOffset++;
    if (this.windOffset % this.playerCount === 0) { this.windOfTheRound++; }
    console.log('\nend of hand ${this.hands.length}, wind offset: ${this.windOffset}, wotr: ${this.windOfTheRound}\n');
    if (this.windOfTheRound < 4) {
      this.start();
    } else {
      console.log("GAME OVER (${this.hands.length} hands played, ${this.draws} draws, ${this.wins} wins)\n");
      setTimeout(process.exit,250);
    }
  }

  handWasWon(winner) {
    // FIXME: TODO: code goes here
    //
    // - Score players.
    // - Rotate winds, if rules say that should happen.
    //     This really means rotating the players, as position [0] counts as East.
    // - Start a new hand.
    console.log("\n${winner.name} (playing seat ${winner.position}) won!\n");
//    var data = fs.readFileSync("walls.txt").toString().split("\n").filter(l => !!l);
//    fs.appendFileSync("winners.txt", data.slice(-1) + "\n");
    this.wins++;
    this.windOffset++;
    if (this.windOffset % this.playerCount === 0) { this.windOfTheRound++; }
    console.log('\nend of hand ${this.hands.length}, wind offset: ${this.windOffset}, wotr: ${this.windOfTheRound}\n');
    if (this.windOfTheRound < 4) {
      this.start();
    } else {
      console.log("GAME OVER (${this.hands.length} hands played, ${this.draws} draws, ${this.wins} wins)\n");
      setTimeout(process.exit,250);
    }
  }

  resolveScores(winner) {
    // FIXME: TODO: code goes here.
  }

  // General purpose

  valueOf() {
    return this;
  }

  toString() {
    return '';
  }
};

module.exports = Game;
