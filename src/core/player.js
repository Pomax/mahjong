'use strict';

var Constants = require('./constants');
var Connector = require('./connector').Server;
var digest = require('./digest');
var uuid = require('uuid');

var debug = false;

/**
 * A player is the bridge between 'someone or something that plays' and the system
 */
class Player {
  constructor(manager, options, sendConnectionInformation) {
    this.manager = manager;
    this.name = options.name;
    this.id = options.id;
    this.uuid = uuid.v4();
    this.setupConnector(sendConnectionInformation);
    this.tiles = [];
    this.revealed = [];
    this.bonus = [];
    this.pendingVerififcation = false;
  }

  setupConnector(sendConnectionInformation, reconnection) {
    // Players are backed by a network connector,
    // allowing them to 'be played' by either real
    // people or autonomous processes.
    var connector = new Connector(this, (port) => {
      if (debug)
        console.log('port for player ${this.id}: ${port}');
      if (sendConnectionInformation) {
        sendConnectionInformation(this.id, this.uuid, port, this);
      } else {
        this.connected = true;
      }
    });
    this.connector = connector;
    this.setConnnectorBindings(reconnection);
  }

  setupConnectorAgain(sendConnectionInformation) {
    this.setupConnector(sendConnectionInformation, true);
  }

  lostConnection() {
    if (this.connected) {
      this.connected = false;
      console.log('connection was lost, clearing connector for ${this.name}');
    }
  }

  setConnnectorBindings(reconnection) {
    var c = this.connector;
    c.subscribe('ready', data => this.readyFromClient(data));
    c.subscribe('deal-bonus-request', data => this.dealBonusRequestFromClient(data || {}));
    c.subscribe('draw-bonus-request', data => this.drawBonusRequestFromClient(data || {}));
    c.subscribe('declare-kong', data => this.kongDeclarationFromClient(data || {}));
    c.subscribe('kong-request', data => this.kongRequestFromClient(data || {}));
    c.subscribe('discard-tile', data => this.discardReceivedFromClient(data));
    c.subscribe('claim-discard', data => this.claimReceivedFromClient(data));
    c.subscribe('set-revealed', data => this.revealReceivedFromClient(data));
    c.subscribe('hand-acknowledged', data => this.handAcknowledgedByClient(data));
    c.subscribe('request-timeout-invalidation', data => this.timeoutInvalidationRequestFromClient(data));
    c.subscribe('verify-result', data => this.verifyResultFromClient(data));
    // enabled for development only
    c.subscribe('disable-claim-timeout', data => this.disableClaimTimeout(data));
    // if this is a reconnection, we need to communicate in-game information
    if (reconnection) { this.sendReconnectionData(c); }
    this.connected = true;
  }

  sendGamelistUpdate(gamelist) {
    this.connector.publish('game-list', gamelist);
  }

  sendReconnectionData(c) {
    if (!this.game) return;
    var currentDiscard = false;
    if (this.hand.currentDiscard) {
      currentDiscard = {
        tile: this.hand.currentDiscard,
        from: this.hand.discardingPlayer
      }
    }
    c.publish('reconnection-data', {
      ruleset: this.game.rulesetName,
      gameid: this.game.id,
      handid: this.hand.id,
      position: this.position,
      windOfTheRound: this.windOfTheRound,
      playerNames: this.competitors,
      tiles: this.tiles,
      bonus: this.bonus,
      revealed: this.revealed,
      currentDiscard,
      tileSituation: this.hand.getCurrentTileSituation(this)
    });
  }

  getCurrentTileSituation(requestingPlayer) {
    if (this === requestingPlayer) {
      return { tiles: this.tiles, bonus: this.bonus, revealed: this.revealed };
    }
    return { tiles: [], handSize: this.tiles.length, bonus: this.bonus, revealed: this.revealed };
  }

  getReady(game, hand, position, windOfTheRound, playerNames) {
    this.game = game;
    this.hand = hand;
    this.position = position;
    this.windOfTheRound = windOfTheRound;
    this.competitors = playerNames;
    this.winner = false;
    this.tiles = [];
    this.revealed = [];
    this.bonus = [];
    this.connector.publish('getready', {
      ruleset: this.game.rulesetName,
      gameid: this.game.id,
      handid: this.hand.id,
      position,
      windOfTheRound,
      playerNames
    });
    // wait for 'ready' signal through connector
  }

  readyFromClient(data) {
    this.hand.readyFromPlayer(this);
  }

  setInitialTiles(tiles, wallSize) {
    this.tiles = tiles.slice().sort(Constants.sort);
    this.connector.publish('initial-tiles', { gameid: this.game.id, handid: this.hand.id, tiles: this.tiles, wallSize });
    // wait for 'bonus-request' through connector
  }

  // ---

  dealBonusRequestFromClient(data) {
    // this _should_ lead to the same result as at the client
    var bonus = this.tiles.filter(t => t >= Constants.PLAYTILES);
    if (bonus.length > 0) {
      this.bonus = this.bonus.concat(bonus);
      this.tiles = this.tiles.filter(t => t < Constants.PLAYTILES);
    }
    this.hand.dealBonusRequestFromPlayer(this, bonus);
  }

  sendDealBonusCompensationTiles(tiles) {
    this.tiles = this.tiles.concat(tiles);
    this.tiles.sort(Constants.sort);
    this.connector.publish('deal-bonus-compensation', { tiles });
  }

  // ---

  drawBonusRequestFromClient(data) {
    // this _should_ lead to the same result as at the client
    var tile = parseInt(data.tile);
    this.bonus.push(tile);
    this.tiles = this.tiles.filter(t => t < Constants.PLAYTILES);
    this.hand.drawBonusRequestFromPlayer(this, tile);
  }

  sendDrawBonusCompensationTile(tile, wallSize) {
    this.tile = this.tiles.push(tile);
    this.tiles.sort(Constants.sort);
    this.connector.publish('draw-bonus-compensation', { tile, wallSize });
  }

  // ---

  bonusCompensationTileSent(player, tiles) {
    var by = player.position;
    this.connector.publish('player-revealed-bonus', { by, tiles });
  }

  kongRequestFromClient(data) {
    this.hand.kongRequestFromPlayer(this, data.tiles);
  }

  sendKongCompensationTile(tile, wallSize) {
    this.tiles.push(tile);
    this.tiles.sort(Constants.sort);
    this.connector.publish('kong-compensation', { tile, wallSize });
  }

  deal(tile, wallSize) {
    this.verify(() => {
      this.tiles.push(tile);
      this.tiles.sort(Constants.sort);
      this.connector.publish('turn-tile', { tile, wallSize });
    });
  }

  tileDealtToPlayer(playerPosition) {
    this.connector.publish('player-received-deal', { playerPosition });
  }

  discardReceivedFromClient(data) {
    var tile = parseInt(data.tile);
    if (tile !== Constants.NOTILE) {
      var pos = this.tiles.indexOf(tile);
      this.tiles.splice(pos,1);
    }
    this.hand.discardReceivedFromPlayer(this, tile, data.selfdrawn);
  }

  claimReceivedFromClient(data) {
    this.hand.claimReceivedFromPlayer(this, data);
  }

  tileWasClaimed(tile, by, claimType, winType) {
    this.connector.publish('tile-claimed', { tile, by, claimType, winType });
  }

  award(tile, claimType, winType) {
    // note: there will be an asymmetry between now and revealReceived,
    // as the server and client add the tile to tiles at different tiles.
    // As such, verify() calls can only happen after the reveal.
    this.tiles.push(parseInt(tile));
    this.connector.publish('claim-awarded', { tile, claimType, winType });
  }

  revealReceivedFromClient(data) {
    var tiles = data.tiles;
    tiles = tiles.map(v => parseInt(v));
    tiles.forEach(tile => {
      let pos = this.tiles.indexOf(tile);
      this.tiles.splice(pos,1);
    });
    this.revealed.push(tiles);
    this.hand.revealReceivedFromPlayer(this, data.tiles);
  }

  setWasRevealed(revealingPlayer, tiles) {
    var from = revealingPlayer.position;
    this.connector.publish('player-revealed', { from, tiles });
  }

  tileWasDiscarded(discardingPlayer, tile) {
    var from = discardingPlayer.position;
    this.connector.publish('tile-discarded', { from, tile });
  }

  handWasDrawn(alltiles) {
    this.connector.publish('hand-drawn', { gameid: this.game.id, handid: this.hand.id, alltiles });
  }

  handWasWon(player, selfdrawn, alltiles) {
    var winner = player.position
    this.connector.publish('hand-won', { gameid: this.game.id, handid: this.hand.id, winner, selfdrawn, alltiles });
  }

  handAcknowledgedByClient() {
    this.hand.handAcknowledgedByPlayer(this);
  }

  recordScores(scores, playerScores) {
    this.connector.publish('hand-score', { scores, playerScores });
  }

  gameOver(gameid) {
    this.connector.publish('game-over', { gameid });
  }

  // FIXME: development only
  disableClaimTimeout(data) {
    this.hand.disableClaimTimeout();
  }

  timeoutInvalidationRequestFromClient(data) {
    this.hand.timeoutInvalidationRequestFromPlayer(this);
  }

  getAllTileData() {
    return {
      tiles: this.tiles,
      bonus: this.bonus,
      revealed: this.revealed
    };
  }

  // General purpose

  verify(next) {
    if (!this.connected) {
      return next();
    }
    this.pendingVerififcation = next;
    this.connector.publish('verify');
  }

  verifyResultFromClient(data) {
    // request the connected player to verify that their knowledge of
    // what should be in their hand and on the table matches what
    // the system considers the player's state.
    if (data.digest !== digest(this.tiles, this.bonus, this.revealed)) {
      console.error('verification failed for ${this.name}');
      console.log('local tile situation:', this.tiles, this.bonus, this.revealed);
      console.log('client tile situation:', data.tiles, data.bonus, data.revealed);
      process.exit(1);
    }
    if (this.pendingVerififcation) {
      var next = this.pendingVerififcation;
      this.pendingVerififcation = false;
      next();
    }
  }

  valueOf() {
    return this;
  }

  toString() {
    return '';
  }
};

module.exports = Player;
