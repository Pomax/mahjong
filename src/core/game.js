'use strict';

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
    this.rulesetName = rulesetName;
    this.ruleset = new rulesets[rulesetName]();
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
    this.scores[player.name] = this.ruleset.STARTING_POINTS;
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
    var hand = this.hand = new Hand(this, this.hands.length, players, this.windOfTheRound, this.windOffset);
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
    this.draws++;
    this.windOffset++;
    if (this.windOffset % this.playerCount === 0) { this.windOfTheRound++; }
    console.log('\nend of hand ${this.hands.length}, wind offset: ${this.windOffset}, wotr: ${this.windOfTheRound}\n');
    if (this.windOfTheRound < 4) {
      this.start();
    } else {
      this.end();
    }
  }

  handWasWon(winner) {
    console.log('\n${winner.name} (playing seat ${winner.position}) won!\n');
    this.resolveScores(this.hand);
    this.wins++;
    this.windOffset++;
    if (this.windOffset % this.playerCount === 0) { this.windOfTheRound++; }
    console.log('\nend of hand ${this.hands.length}, wind offset: ${this.windOffset}, wotr: ${this.windOfTheRound}\n');
    if (this.windOfTheRound < 4) {
      this.start();
    } else {
      this.end();
    }
  }

  end() {
    console.log('GAME OVER (${this.hands.length} hands played, ${this.draws} draws, ${this.wins} wins)\n');
    console.log('Final scores:\n', JSON.stringify(this.scores,false,2));
    setTimeout(process.exit,250);
  }

  resolveScores(hand) {
    var players = this.hand.players;
    var scores = this.ruleset.score(players, this.windOfTheRound);
    players.forEach((player,pid) => {
      let scoreObject = scores[pid];
      this.scores[player.name] += scoreObject.score;
      player.recordScore(scoreObject);
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

module.exports = Game;