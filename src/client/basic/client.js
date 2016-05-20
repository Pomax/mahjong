'use strict';

var Constants = require('../../core/constants');
var Tiles = require('../../core/tiles');
var rulesets = require('../../core/rules');
var digest = require('../../core/digest');
var Connector = require('../../core/connector').Client;

var debug = false;

/**
 * A client without an interface
 */
class Client {
  constructor(name, port, afterBinding) {
    this.name = name;
    this.reset();
    this.connector = new Connector(connector => {
      this.setSocketBindings(port, connector, afterBinding);
    }, port);
  }

  log() {
    if (debug) console.log.apply(console, arguments);
  }

  reset() {
    this.tiles = [];
    this.bonus = [];
    this.revealed = [];
    this.players = [];
    [0,1,2,3].forEach(position => {
      this.players[position] = {name:'', position, handSize: 0, revealed: [], bonus: []};
    });
  }

  setupAI(ruleset) {
    // AI backing
    var Rules = rulesets[ruleset];
    var rules = this.rules = new Rules();
    var AI = rules.getAI();
    this.ai = new AI(this);
  }

  setGameData(data) {
    this.reset();
    this.currentGame = data;
    this.currentGame.turn = 0;
    this.setupAI(data.ruleset);
    data.playerNames.forEach((name,position) => {
      this.players[position].name = name;
    });
  }

  /**
   * Set the initial game hand. This may include
   * bonus tiles, which need to be moved out
   * and compensated for, handled in 'checkDealBonus'.
   */
  setInitialTiles(tiles) {
    this.tiles = tiles.map(v => parseInt(v));
    this.players.forEach(player => { player.handSize = this.tiles.length; });
    this.checkDealBonus();
  }

  /**
   * used for bonus requests during the initial deal, when we can
   * get more than one bonus tile.
   */
  checkDealBonus() {
    var bonus = this.tiles.map(v => parseInt(v)).filter(t => t >= Constants.PLAYTILES);
    if (bonus.length > 0) {
      this.bonus = this.bonus.concat(bonus);
      this.tiles = this.tiles.map(v => parseInt(v)).filter(t => t < Constants.PLAYTILES);
      this.log('requesting compensation for bonus tiles ${bonus}');
    }
    this.connector.publish('deal-bonus-request', { tiles: this.bonus });
  }

  /**
   * Process compensation tiles for any bonus tiles
   * received during the initial deal. Not that this
   * may also include _new_ bonus tiles, which need
   * to be moved out and compensated for again,
   * handled in 'checkDealBonus'.
   */
  processDealBonusTiles(tiles) {
    this.tiles = this.tiles.concat(tiles);
    this.checkDealBonus();
  }

  /**
   * A prefilted for regular play tiles being dealt
   * to a player. If this is a bonus tile, it is put
   * in the bonus bank, and a new tile is requested.
   */
  checkDrawBonus(tile, wallSize) {
    if (tile >= Constants.BONUS) {
      this.bonus.push(tile);
      this.log('${this.name} drew bonus tile, requesting draw bonus compensation');
      return this.connector.publish('draw-bonus-request', { tile });
    }
    this.addTile(tile, wallSize);
  }

  /**
   * Add a tile to the client's hand (prefiltered for
   * bonus tiles, so we know this is a normal tile).
   */
  addTile(tile, wallSize) {
    this.currentGame.turn++;
    this.currentGame.wallSize = wallSize;
    this.tiles.push(tile);
    this.ai.tracker.gained(this.currentGame.position, tile);
    this.ai.updateStrategy();
    this.discardTile(true);
  }

  /**
   * used by all protocol steps that involve 'discarding a tile'
   */
  discardTile(cleandeal) {
    if (this.rules.checkCoverage(this.tiles, this.bonus, this.revealed)) {
      return this.connector.publish('discard-tile', { tile: Constants.NOTILE, selfdrawn: true });
    }
    var tile = this.ai.determineDiscard();
    this.processTileDiscardChoice(tile);
  }

  /**
   * handle the discard process once a tile has been chosen
   */
  processTileDiscardChoice(tile) {
    if (tile !== Constants.NOTILE) {
      var pos = this.tiles.indexOf(tile);
      this.tiles.splice(pos,1);
      this.log(this.name, 'discarding: ', tile);
    }
    this.connector.publish('discard-tile', { tile });
  }

  /**
   * Determine whether we want to claim a discarded tile
   */
  determineClaim(from, tile, sendClaim) {
    this.ai.updateStrategy(tile);
    sendClaim(this.ai.determineClaim(tile));
  }

  /**
   * Process an awarded claim, leading to a reveal notification
   */
  processClaimAward(data) {
    this.currentGame.turn++;

    var tile = parseInt(data.tile);
    var claimType = parseInt(data.claimType);
    var winType = parseInt(data.winType);

    this.log('${this.name} was allowed to form a ${Constants.setNames[claimType]} with tile ${tile}');

    // figure out what we were actually awarded
    var tiles = false;
    if(claimType <= Constants.CHOW3) {
      if(claimType === Constants.CHOW1) { tiles = [tile,tile+1,tile+2]; }
      if(claimType === Constants.CHOW2) { tiles = [tile-1,tile,tile+1]; }
      if(claimType === Constants.CHOW3) { tiles = [tile-2,tile-1,tile]; }
    }
    else if(claimType === Constants.PUNG) { tiles = [tile, tile, tile]; }
    else if(claimType === Constants.KONG) { tiles = [tile, tile, tile, tile]; }
    else if(claimType === Constants.WIN)  {
      if(winType === Constants.PAIR)  { tiles = [tile, tile]; }
      if(winType === Constants.CHOW1) { tiles = [tile,tile+1,tile+2]; }
      if(winType === Constants.CHOW2) { tiles = [tile-1,tile,tile+1]; }
      if(winType === Constants.CHOW3) { tiles = [tile-2,tile-1,tile]; }
      if(winType === Constants.PUNG)  { tiles = [tile, tile, tile]; }
      if(winType === Constants.KONG)  { tiles = [tile, tile, tile, tile]; }
    }

    // process and reveal the tiles
    this.revealed.push(tiles);
    this.tiles.push(tile);
    tiles.forEach(t => {
      let pos = this.tiles.indexOf(t);
      this.tiles.splice(pos,1);
    });

    if (claimType === Constants.KONG) {
      this.connector.publish('kong-request', { tiles });
    }

    return tiles;
  }

  /**
   * ...
   */
  tileClaimed(tile, by, claimType, winType) {
    // ...
  }

  /**
   * ...
   */
  recordReveal(playerPosition, tiles) {
    this.ai.tracker.revealed(playerPosition, tiles);
    this.ai.updateStrategy();
    var player = this.players[playerPosition];
    player.revealed.push(tiles);
    player.handSize -= tiles.length;
  }

  /**
   * ...
   */
  recordBonus(playerPosition, tiles) {
    var player = this.players[playerPosition];
    player.bonus = player.bonus.concat(tiles);
  }

  /**
   * ...
   */
  handDrawn(acknowledged) {
    acknowledged();
  }

  /**
   * ...
   */
  handWon(winner, selfdrawn, acknowledged) {
    acknowledged();
  }

  /**
   * ...
   */
  processHandScore(scoreObject) {
    //this.log('${this.name} received score object',scoreObject);
  }

  /**
   * ...
   */
  verify(data) {
    this.connector.publish("verify-result", {
      tiles: this.tiles,
      bonus: this.bonus,
      revealed: this.revealed,
      digest: digest(this.tiles, this.bonus, this.revealed)
    });
  }

  /**
   * ...
   */
  socketPreBindings() {
    // ...extensions can drop code here...
  }

  /**
   * Set up the listening side of the client protocol.
   */
  setSocketBindings(port, connector, afterBinding) {
    var c = this.connector = connector;

    c.subscribe('connect', data => {
      this.log('connected on port ${port}');

      this.socketPreBindings();

      c.subscribe('getready', data => {
        this.log('instructed to get ready by the server on ${port}');
        this.setGameData(data);
        c.publish('ready');
      });

      c.subscribe('initial-tiles', data => {
        this.log('initial tiles for ${this.name}: ', data.tiles);
        this.setInitialTiles(data.tiles);
      });

      c.subscribe('deal-bonus-compensation', data => {
        this.log('deal bonus compensation tiles for ${this.name}: ', data.tiles);
        this.processDealBonusTiles(data.tiles.map(v => parseInt(v)));
      });

      c.subscribe('turn-tile', data => {
        this.log(this.name, 'received turn tile: ', data.tile);
        this.checkDrawBonus(parseInt(data.tile), parseInt(data.wallSize));
      });

      c.subscribe('draw-bonus-compensation', data => {
        this.log('draw bonus compensation tile for ${this.name}: ', data.tile);
        this.checkDrawBonus(parseInt(data.tile), parseInt(data.wallSize));
      });

      c.subscribe('tile-discarded', data => {
        var from = parseInt(data.from);
        var tile = parseInt(data.tile);
        if (parseInt(from) === this.currentGame.position) {
          return c.publish('claim-discard', { claimType: Constants.NOTHING });
        }
        var claim = this.determineClaim(from, tile, claim => {
          c.publish('claim-discard', claim);
        });
      });

      c.subscribe('claim-awarded', data => {
        var tiles = this.processClaimAward(data);
        c.publish('set-revealed', { tiles });
      });

      c.subscribe('tile-claimed', data => {
        this.tileClaimed(parseInt(data.tile), parseInt(data.by), parseInt(data.claimType), parseInt(data.winType));
      });

      c.subscribe('kong-compensation', data => {
        this.log('kong compensation tile for ${this.name}: ', data.tile);
        this.checkDrawBonus(parseInt(data.tile), parseInt(data.wallSize));
      });

      c.subscribe('player-revealed', data => {
        if (data.from == this.currentGame.position) {
          // if this is not a kong, we now need to discard something.
          if (data.tiles.length < 4) this.discardTile();
          // if it WAS a kong, we need to wait for our compensation tile.
        } else {
          this.recordReveal(parseInt(data.from), data.tiles);
        }
      });

      c.subscribe('player-revealed-bonus', data => {
        this.recordBonus(parseInt(data.by), data.tiles);
      });

      c.subscribe('hand-drawn', data => {
        this.log('${this.name} in seat ${this.currentGame.position} registered that the hand was a draw.');
        this.handDrawn(() => c.publish('hand-acknowledged'));
      });

      c.subscribe('hand-won', data => {
        var winner = parseInt(data.winner);
        var selfdrawn = data.selfdrawn ? '(self-drawn) ' : '';
        this.log('${this.name} in seat ${this.currentGame.position} registered that the hand was won ${selfdrawn}by player in seat ${winner}.');
        this.handWon(winner, selfdrawn, () => c.publish('hand-acknowledged'));
      });

      c.subscribe('hand-score', data => {
        this.processHandScore(data);
      });

      c.subscribe('verify', data => {
        this.verify(data);
      });
    });

    if (afterBinding) afterBinding(this);
  }
}

module.exports = Client;
