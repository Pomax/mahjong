'use strict';

var Constants = require('./constants');
var Connector = require('./connector');

/**
 * A player is the bridge between "someone or something that plays" and the system
 */
class Player {
  constructor(manager, options, sendPortInformation) {
    this.manager = manager;
    this.name = options.name;
    this.id = options.id;

    // Players are backed by a network connector,
    // allowing them to "be played" by either real
    // people or autonomous processes.
    var connector = new Connector((port) => {
      console.log("port for player ${this.id}: ${port}");
      if (sendPortInformation) {
        sendPortInformation(port);
      }
    });
    this.connector = connector;
    this.setConnnectorBindings();

    this.tiles = [];
    this.revealed = [];
    this.bonus = [];
  }

  setConnnectorBindings() {
    var c = this.connector;
    c.subscribe("ready", data => this.readyFromClient(data));
    c.subscribe("bonus-request", data => this.bonusRequestFromClient(data || {}));
    c.subscribe("discard-tile", data => this.discardReceivedFromClient(data));
    c.subscribe("claim-discard", data => this.claimReceivedFromClient(data));
    c.subscribe("set-revealed", data => this.revealReceivedFromClient(data));
    c.subscribe("hand-acknowledged", () => this.handAcknowledgedByClient());
  }

  getReady(game, hand, position, windOfTheRound) {
    this.game = game;
    this.hand = hand;
    this.position = position;
    this.windOfTheRound = windOfTheRound;
    this.tiles = [];
    this.revealed = [];
    this.bonus = [];
    this.connector.publish("getready", {
      gameid: this.game.id,
      handid: this.hand.id,
      position,
      windOfTheRound
    });
    // wait for 'ready' signal through connector
  }

  readyFromClient(data) {
    console.log("ready received from client");
    this.hand.readyFromPlayer(this);
  }

  setInitialTiles(tiles) {
    this.tiles = tiles.slice().sort(Constants.sort);
    this.connector.publish("initial-tiles", {
      gameid: this.game.id,
      handid: this.hand.id,
      tiles: this.tiles
    });
    // wait for 'bonus-request' through connector
  }

  bonusRequestFromClient(data) {
    // this _should_ lead to the same result as at the client
    var bonus = this.tiles.filter(t => t >= Constants.PLAYTILES);
    if (bonus.length > 0) {
      this.bonus = this.bonus.concat(bonus);
      this.tiles = this.tiles.filter(t => t < Constants.PLAYTILES);
    }
    this.hand.bonusRequestFromPlayer(this, bonus);
  }

  sendBonusCompensationTiles(tiles) {
    this.connector.publish("bonus-compensation", { tiles });
  }

  bonusCompensationTileSent(player, tiles) {
    var by = player.position;
    this.connector.publish("player-revealed-bonus", { by, tiles });
  }

  deal(tile) {
    this.tiles.push(tile);
    this.tiles.sort();
    this.connector.publish("turn-tile", { tile });
  }

  discardReceivedFromClient(data) {
    var tile = data.tile;
    var pos = this.tiles.indexOf(tile);
    this.tiles.splice(pos,1);
    this.hand.discardReceivedFromPlayer(this, tile, data.selfdrawn);
  }

  claimReceivedFromClient(data) {
    //console.log(data);
    this.hand.claimReceivedFromPlayer(this, data);
  }

  tileWasClaimed(tile, player, claim) {
  }

  award(tile, claim) {
    this.connector.publish("claim-awarded", { tile, claim });
  }

  revealReceivedFromClient(data) {
    this.hand.revealReceivedFromPlayer(this, data.tiles);
  }

  setWasRevealed(revealingPlayer, tiles) {
    var from = revealingPlayer.position;
    this.connector.publish("player-revealed", { from, tiles });
  }

  tileWasDiscarded(discardingPlayer, tile) {
    var from = discardingPlayer.position;
    this.connector.publish("tile-discarded", { from, tile });
  }

  handWasDrawn() {
    this.connector.publish("hand-drawn", { gameid: this.game.id, handid: this.hand.id });
  }

  handWasWon(player, selfdrawn) {
    var winner = player.position
    this.connector.publish("hand-won", { gameid: this.game.id, handid: this.hand.id, winner, selfdrawn });
  }

  handAcknowledgedByClient() {
    this.hand.handAcknowledgedByPlayer(this);
  }

  // General purpose

  verify() {
    // request the connected player to verify that their knowledge of
    // what should be in their hand and on the table matches what
    // the system considers the player's state.
    var digest = digest(this.tiles.sort(), this.revealed, this.bonus);
    // FIXME: TODO: code goes here
  }

  valueOf() {
    return this;
  }

  toString() {
    return '';
  }
};

module.exports = Player;
