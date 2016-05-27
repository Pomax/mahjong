'use strict';

var Constants = require('./constants');
var Wall = require('./wall');
var Tiles = require('./tiles');

var debug = false;

/**
 * A hand represents a single round of play
 */
var stages = {
  PRESTART: 'prestart',
  STARTING: 'starting',
  INITIALDEAL: 'intial deal',
  PLAYERTURN: 'player turn',
  DISCARD: 'discard',
  CLAIM: 'claim',
  REVEAL: 'reveal',
  DRAW: 'finished:draw',
  WON: 'finished:won'
};

class Hand {

  constructor(game, id, players, windOfTheRound, windOffset) {
    this.game = game;
    this.id = id;

    var roll = players.length - (windOffset % players.length);
    players = players.slice(roll).concat(players.slice(0,roll));
    this.players = players;

    this.windOfTheRound = windOfTheRound;
    this.windOffset = windOffset;
    this.wall = new Wall(this);
    this.claimTimeoutInterval = 5000;       // should come from rules
    this.minimalClaimTimeoutInterval = 1;   // should come from rules?
    this.setStage(stages.PRESTART);
    // used at some point in the code.
    this.currentDiscard = false;
    this.discardingPlayer = false;

    this.log = () => debug ? console.log.apply(console, arguments) : false;
  }

  setStage(stage) {
    this.stage = stage;
  }

  // FIXME: development only
  disableClaimTimeout() {
    this.claimTimeoutInterval = false;
  }

  /**
   * Protocol for a round of play:
   *
   *  start =>
   *  - mark player [0] as active player
   *  - tell all players to get ready
   *  - wait for ready notices
   *
   *  all players ready =>
   *  - deal initial tiles
   *  - wait for bonus tile requests
   *
   *  | bonus request =>
   *  | - deal compensation tile to requesting player
   *  | - wait for player to signal new bonus request or 'no request'
   *
   *  all players signal 'negative' bonus request =>
  (A) - deal tile to active player
   *  - wait for bonus request
   *
   *  | bonus request =>
  (B) | - deal compensation tile to active player
   *  | - wait for player to signal new bonus request or 'no request'
   *
   *  active player signaled 'negative' bonus request =>
  (C) - wait for discard by player
   *
   *  discard by active player =>
   *  - tell all other players what the discard is
   *  - wait for all players to submit a claim, but with a cutoff timeout
   *
   *  all players submitted claim OR submission timeout occurred:
   *  - filter claims:
   *
   *  | no claims submitted:
   *  | - set next player as active player
   *  | - continue game loop at (A)
   *
   *  | claims submitted:
   *  | - notify all players of all claims
   *  | - filter valid and invalid claims
   *  | - (deny all invalid claims?)
   *  | - (notify all players of all invalid claims?)
   *  | - set best-claim player as active player
   *  | - inform all players of claim award
   *  | - implicitly continue game loop at (C)
   *
   * Wins can occur at: C
   * Draws may occur at: A, B
   *
   */
  start() {
    console.log("new round start");

    if (this.started) { return console.error('cannot start: hand already in progress.'); }
    if (this.finished) { return console.error('cannot start: hand already finished.'); }

    this.setStage(stages.STARTING);
    this.started = true;
    this.activePlayer = this.players[0];
    var playerNames = this.players.map(player => player.name);
    this.log('Starting hand ${this.id}');
    this.ready = {};
    this.players.forEach((player,position) => {
      player.getReady(this.game, this, position, this.windOfTheRound, playerNames);
    });
  }

  /**
   * Clear the discard claim timeout, so that bids must come in
   * before the discard passes.
   */
  timeoutInvalidationRequestFromPlayer() {
    clearTimeout(this.claimTimeout);
    this.claimTimeout = false;
  }

  /**
   * ...
   */
  readyFromPlayer(player) {
    if (this.stage !== stages.STARTING) {
      return console.error('player reported ready outside of the STARTING stage: ignored.');
    }

    this.ready[player.name] = true;
    var readies = Object.keys(this.ready).length;
    if (readies === this.players.length) {
      this.dealInitialTiles();
    }
  }

  /**
   * ...
   */
  dealInitialTiles() {
    this.setStage(stages.INITIALDEAL);
    this.listenForBonusRequests();
    this.players.forEach(player => {
      let tiles = this.wall.getInitialTiles();
      player.setInitialTiles(tiles);
    });
  }

  /**
   * ...
   */
  listenForBonusRequests() {
    this.pendingBonusRequests = {};
    this.players.forEach(player => {
      this.pendingBonusRequests[player.name] = 'pending';
    });
  }

  /**
   * ...
   */
  dealBonusRequestFromPlayer(player, bonusTilesToReplace) {
    if (this.stage !== stages.INITIALDEAL) {
      return console.error('player requesting bonus tile compensation outside of the INITIALDEAL stage: ignored.');
    }

    if (!bonusTilesToReplace || bonusTilesToReplace.length === 0) {
      this.pendingBonusRequests[player.name] = 'handled';
    } else {
      this.sendDealBonusCompensationTiles(player, bonusTilesToReplace);
      // leave state as pending, as the compensation could contain bonus tiles
    }

    var playerNames = Object.keys(this.pendingBonusRequests);
    var pending = false;
    for (let name of playerNames) {
      if (this.pendingBonusRequests[name] === 'pending') {
        pending = true;
        break;
      }
    }

    if (playerNames.length === this.players.length && !pending) {
      this.dealToActivePlayer();
    }
  }

  /**
   * ...
   */
  sendDealBonusCompensationTiles(receivingPlayer, bonusTilesToReplace) {
    var compensation = bonusTilesToReplace.map(tile => this.wall.drawSupplement());
    receivingPlayer.sendDealBonusCompensationTiles(compensation);
    this.players.forEach(player => {
      player.bonusCompensationTileSent(receivingPlayer, bonusTilesToReplace);
    });
  }

  /**
   * ...
   */
  drawBonusRequestFromPlayer(receivingPlayer, bonusTileToReplace) {
    if (this.stage !== stages.PLAYERTURN) {
      return console.error('player requesting bonus tile compensation outside of the PLAYERTURN stage: ignored.');
    }
    var compensation = this.wall.drawSupplement();
    receivingPlayer.sendDrawBonusCompensationTile(compensation, this.wall.playlength());
    this.players.forEach(player => {
      player.bonusCompensationTileSent(receivingPlayer, [bonusTileToReplace]);
    });
  }


  /**
   * ...
   */
  dealToActivePlayer() {
    this.setStage(stages.PLAYERTURN);
    if (this.finished) {
      return console.error('cannot deal tile: hand already finished.');
    }

    var tile = this.wall.draw();
    if (tile === Constants.NOTILE) {
      this.log('wall exhausted (during deal)');
      return this.handWasDrawn();
    }
    this.activePlayer.deal(tile, this.wall.playlength());
    this.players.forEach(player => {
      if (player === this.activePlayer) return;
      player.tileDealtToPlayer(this.activePlayer.position);
    });
  }

  /**
   * ...
   */
  bonusRequestFromActivePlayer(bonusTileToReplace) { // only ever for 1 tile
    if (this.stage !== stages.PLAYERTURN) {
      return console.error('player requesting bonus tile compensation outside of the PLAYERTURN stage: ignored.');
    }

    this.sendBonusCompensationTile(this.activePlayer, bonusTileToReplace);
  }

  /**
   * ...
   */
  sendBonusCompensationTile(bonusTileToReplace) {
    var compensation = this.wall.drawSupplement();

    if (compensation === Constants.NOTILE) {
      this.log('wall exhausted (during compensation)');
      return this.handWasDrawn();
    }

    player.sendBonusCompensationTiles([compensation]);
    this.players.forEach(other => {
      if (other === player) return;
      other.tileDealtToPlayer(player.position);
    });
  }

  /**
   * ...
   */
  kongRequestFromPlayer(player, kong) {
    var compensation = this.wall.drawSupplement();

    if (compensation === Constants.NOTILE) {
      this.log('wall exhausted (during compensation)');
      return this.handWasDrawn();
    }

    player.sendKongCompensationTile(compensation, this.wall.playlength());
  }

  /**
   * ...
   */
  discardReceivedFromPlayer(discardingPlayer, tile, selfdrawn) {
    if (this.stage !== stages.PLAYERTURN) {
      return console.error('player discard a tile outside of the PLAYERTURN stage: ignored.');
    }

    if (discardingPlayer !== this.activePlayer) {
      console.error('${discardingPlayer.name} just discarded during turn of ${this.activePlayer.name}...');
      processing.exit(1);
    }

    if (tile === Constants.NOTILE) {
      discardingPlayer.winner = true;
      return this.handWasWon(discardingPlayer, selfdrawn);
    }

    this.setStage(stages.DISCARD);
    this.currentDiscard = tile;
    this.discardingPlayer = discardingPlayer;
    this.listenForClaims();
    if (this.claimTimeoutInterval) {
      this.lockClaimTimeout();
      this.claimTimeout = setTimeout(() => this.processClaims(), this.claimTimeoutInterval);
    }
    this.players.forEach(player => player.tileWasDiscarded(discardingPlayer, tile));
  }

  // Lock the claim system so that even if we get enough votes,
  // the tile stays available for at least X milliseconds.
  lockClaimTimeout() {
    this.claimLock = true;
    setTimeout(() => this.unlockClaimTimeout(), this.minimalClaimTimeoutInterval);
  }

  // Unlock the claim system.
  unlockClaimTimeout() {
    this.claimLock = false;
  }

  /**
   * ...
   */
  listenForClaims() {
    this.claims = {};
    this.players.forEach(player => {
      this.claims[player.name] = 'pending';
    });
  }

  /**
   * ...
   */
  claimReceivedFromPlayer(player, claim) {
    if (this.stage !== stages.DISCARD) {
      return console.error('player claimed a discard tile outside of the DISCARD stage: ignored.');
    }

    if (typeof this.claims[player.name] === 'object') {
      return console.error('player ${player.name} already has an outstanding claim...');
    }

    claim.player = player;
    this.claims[player.name] = claim;

    var playerNames = Object.keys(this.claims);

    var pending = false;
    for (let name of playerNames) {
      if (this.claims[name] === 'pending') {
        pending = true;
        break;
      }
    }

    if (playerNames.length === this.players.length && !pending) {
      clearTimeout(this.claimTimeout);
      this.processClaims();
    }
  }

  /**
   * ...
   */
  processClaims() {
    // spin until unlocked, if accessed too soon.
    if (this.claimLock) {
      return setTimeout(() => this.processClaims(), 250);
    }

    if (this.stage !== stages.DISCARD) {
      return console.error('processClaims called outside of the DISCARD stage: ignored.');
    }

    this.setStage(stages.CLAIM);
    var playerNames = Object.keys(this.claims);
    var valid = playerNames.filter(name => this.isValidClaim(name, this.claims[name]));
    // nothing to do
    if (valid.length === 0) {
      this.log('no valid claims were received.');
      return this.nextDeal();
    }
    // inform all players of this claim
    var mapped = valid.map(name => this.claims[name]);
    var best = this.getBestClaim(mapped);
    this.players.forEach(player => player.tileWasClaimed(
      this.currentDiscard,
      player.position,
      best.claimType,
      best.winType
    ));
    this.rewardClaim(best);
  }

  /**
   * ...
   */
  isValidClaim(name, claim) {
    if (claim === 'pending') { return false; }
    var ct = claim.claimType;
    if (ct === Constants.NOTHING) { return false; }
    if (ct <= Constants.CHOW3) {
      // check if the claim is legal, based on seating
      if (claim.player.position !== (this.discardingPlayer.position + 1) % this.players.length) return false;
      // check if the chow is for a numbered tile
      var face = Tiles.getTileNumber(this.currentDiscard);
      if (face === false) return false;
      // check if the tile's value allows for the claim type issued
      if (face === 0 && ct !== Constants.CHOW1) return false;
      if (face === 1 && ct === Constants.CHOW3) return false;
      if (face === 7 && ct === Constants.CHOW1) return false;
      if (face === 8 && ct !== Constants.CHOW3) return false;
    }
    // FIXME: TODO: verify that a player _can_ claim what they claim based on tiles in hand.
    return true;
  }

  /**
   * ...
   */
  getBestClaim(claims) {
    // FIXME: TODO: ensure ties between "win" calls are resolved correctly
    return claims.sort((a,b) => b.claimType - a.claimType)[0];
  }

  /**
   * ...
   */
  rewardClaim(claim) {
    if (this.stage !== stages.CLAIM) {
      return console.error('rewardClaim called outside of the CLAIM stage: ignored.');
    }
    this.activePlayer = claim.player;
    this.activePlayer.award(this.currentDiscard, claim.claimType, claim.winType);
    this.currentDiscard = false;
    this.discardingPlayer = false;
    this.setStage(stages.REVEAL);
  }

  /**
   *
   */
  revealReceivedFromPlayer(revealingPlayer, tiles) {
    if (this.stage !== stages.REVEAL && this.stage !== stages.PLAYERTURN) {
      return console.error('player revealed outside of the REVEAL/PLAYERTURN stages: ignored.');
    }
    this.players.forEach(player => player.setWasRevealed(revealingPlayer, tiles));
    this.setStage(stages.PLAYERTURN);
  }

  /**
   * ...
   */
  nextDeal() {
    var pos = this.players.indexOf(this.activePlayer);
    this.activePlayer = this.players[ (pos + 1) % this.players.length ];
    this.dealToActivePlayer();
  }

  // wins, draws

  /**
   * ...
   */
  handWasDrawn() {
    console.log("hand was a draw");
    this.setStage(stages.DRAW);
    this.finished = true;
    this.draw = true;
    var alltiles = this.getAllTileData();
    this.acknowledged = {};
    this.players.forEach(player => player.handWasDrawn(alltiles));
  }

  /**
   * ...
   */
  handWasWon(winner, selfdrawn) {
    console.log("hand was a won by", winner.name);
    this.setStage(stages.WON);
    this.finished = true;
    this.winner = winner;
    var alltiles = this.getAllTileData();
    this.acknowledged = {};
    this.players.forEach(player => player.handWasWon(winner, selfdrawn, alltiles));
  }

  /**
   * While a hand is being played, a reconnecting player
   * will need to know what has been played so far, and
   * who has which bonus tiles etc.
   */
  getCurrentTileSituation(requestingPlayer) {
    var tiledata = {};
    this.players.forEach(player => {
      tiledata[player.name] = player.getCurrentTileSituation(requestingPlayer);
    });
    return tiledata;
  }

  /**
   * Once a hand is over, all players get to see
   * all player tile information. This can be made
   * contingent on buy-in from the players, but by
   * default we communicate the final tile situation.
   */
  getAllTileData() {
    var tiledata = {};
    this.players.forEach(player => tiledata[player.name] = player.getAllTileData());
    return tiledata;
  }

  /**
   * ...
   */
  handAcknowledgedByPlayer(player) {
    if (this.stage !== stages.DRAW && this.stage !== stages.WON) {
      return console.error('player acknowledged outside of the DRAW/WON stage: ignored.');
    }

    this.acknowledged[player.name] = true;
    var acks = Object.keys(this.acknowledged).length;
    if (acks === this.players.length) {
      if (this.winner) {
        this.game.handWasWon(this.winner);
      } else {
        this.game.handWasDrawn();
      }
    }
  }

  // General purpose

  valueOf() {
    return this;
  }

  toString() {
    return '';
  }
};

module.exports = Hand;
