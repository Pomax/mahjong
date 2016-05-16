'use strict';

var Constants = require('./constants');
var Wall = require('./wall');

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
    this.players = players;
    this.windOfTheRound = windOfTheRound;
    this.windOffset = windOffset;
    this.wall = new Wall(this);
    this.claimTimeoutInterval = 5000;
    this.setStage(stages.PRESTART);
  }

  setStage(stage) {
    this.stage = stage;
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
    if (this.started) { return console.error('cannot start: hand already in progress.'); }
    if (this.finished) { return console.error('cannot start: hand already finished.'); }

    this.setStage(stages.STARTING);
    this.started = true;
    this.activePlayer = this.players[0];

    console.log('\nStarting hand ${this.id}\n\n');
    this.ready = {};
    this.players.forEach((player,position) => {
      var seat = (position + this.windOffset) % this.players.length;
      player.getReady(this.game, this, seat, this.windOfTheRound);
    });
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
  bonusRequestFromPlayer(player, bonusTilesToReplace) {
    if (this.stage !== stages.INITIALDEAL) {
      return console.error('player requesting bonus tile compensation outside of the INITIALDEAL stage: ignored.');
    }

    if (!bonusTilesToReplace || bonusTilesToReplace.length === 0) {
      this.pendingBonusRequests[player.name] = 'handled';
    } else {
      this.sendBonusCompensationTiles(player, bonusTilesToReplace);
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
  sendBonusCompensationTiles(receivingPlayer, bonusTilesToReplace) {
    var compensation = bonusTilesToReplace.map(tile => this.wall.drawSupplement());
    receivingPlayer.sendBonusCompensationTiles(compensation);
    this.players.forEach(player => {
      player.bonusCompensationTileSent(receivingPlayer, bonusTilesToReplace);
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
      console.log('wall exhausted (during deal)');
      return this.handWasDrawn();
    }
    this.activePlayer.deal(tile);
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
      console.log('wall exhausted (during compensation)');
      return this.handWasDrawn();
    }

    player.sendBonusCompensationTiles([compensation]);
  }

  /**
   * ...
   */
  kongRequestFromPlayer(player, kong) {
    var compensation = this.wall.drawSupplement();

    if (compensation === Constants.NOTILE) {
      console.log('wall exhausted (during compensation)');
      return this.handWasDrawn();
    }

    player.sendKongCompensationTile(compensation);
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
    this.listenForClaims();
    this.claimTimeout = setTimeout(() => this.processClaims(), this.claimTimeoutInterval);
    this.players.forEach(player => player.tileWasDiscarded(discardingPlayer, tile));
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
    if (this.stage !== stages.DISCARD) {
      return console.error('processClaims called outside of the DISCARD stage: ignored.');
    }

    this.setStage(stages.CLAIM);
    var playerNames = Object.keys(this.claims);
    var valid = playerNames.filter(name => this.isValidClaim(this.claims[name]));

    // nothing to do
    if (valid.length === 0) {
      return this.nextDeal();
    }

    // inform all players of this claim
    var best = this.getBestClaim(valid.map(name => this.claims[name]));
    this.players.forEach(player => player.tileWasClaimed(this.currentDiscard, best.player, best.claim));
    this.rewardClaim(best);
  }

  /**
   * ...
   */
  isValidClaim(claim) {
    var ct = claim.claimType;
    if (ct === Constants.NOTHING) {
      return false;
    }
    if (ct <= Constants.CHOW3) {
      return claim.player.position === (this.discardingPlayer + 1) % this.players.length;
    }
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
    delete claim.player;
    this.activePlayer.award(this.currentDiscard, claim);
    this.currentDiscard = false;
    this.setStage(stages.REVEAL);
  }

  /**
   *
   */
  revealReceivedFromPlayer(revealingPlayer, tiles) {
    if (this.stage !== stages.REVEAL) {
      return console.error('player revealed outside of the REVEAL stage: ignored.');
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
    console.log("\n\n");
    this.setStage(stages.DRAW);
    this.finished = true;
    this.draw = true;
    this.acknowledged = {};
    this.players.forEach(player => player.handWasDrawn());
  }

  /**
   * ...
   */
  handWasWon(winner, selfdrawn) {
    console.log("\n\n");
    this.setStage(stages.WON);
    this.finished = true;
    this.winner = winner;
    this.acknowledged = {};
    this.players.forEach(player => player.handWasWon(winner, selfdrawn));
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
