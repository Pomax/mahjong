'use strict'

var Constants = require('../../core/constants');
var Tiles = require('../../core/tiles');
var rulesets = require('../../core/rules')
var digest = require('../../core/digest');

var debug = false;

/**
 * A client without an interface
 */
class Client {
  constructor(name, port, afterBinding) {
    this.name = name;
    this.reset();
    var io = require('socket.io-client');
    this.log('connecting to port ${port}...');
    var socket = this.socket = io.connect('http://localhost:${port}');
    this.setSocketBindings(port, socket, afterBinding);
  }

  log() {
    if (debug) console.log.apply(console, arguments);
  }

  reset() {
    this.tiles = [];
    this.bonus = [];
    this.revealed = [];
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
    this.setupAI(data.ruleset);
  }

  /**
   * Set the initial game hand. This may include
   * bonus tiles, which need to be moved out
   * and compensated for, handled in 'checkDealBonus'.
   */
  setInitialTiles(tiles) {
    this.tiles = tiles.map(v => parseInt(v));
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
    this.socket.emit('deal-bonus-request', { tiles: this.bonus });
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
  checkDrawBonus(tile) {
    if (tile >= Constants.BONUS) {
      this.bonus.push(tile);
      this.log('${this.name} drew bonus tile, requesting draw bonus compensation');
      return this.socket.emit('draw-bonus-request', { tile });
    }
    this.addTile(tile);
  }

  /**
   * Add a tile to the client's hand (prefiltered for
   * bonus tiles, so we know this is a normal tile).
   */
  addTile(tile) {
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
      return this.socket.emit('discard-tile', { tile: Constants.NOTILE, selfdrawn: true });
    }

    var tile = this.ai.determineDiscard();
    if (tile !== Constants.NOTILE) {
      var pos = this.tiles.indexOf(tile);
      this.tiles.splice(pos,1);
      this.log(this.name, 'discarding: ', tile);
    }
    this.socket.emit('discard-tile', { tile });
  }

  /**
   * Determine whether we want to claim a discarded tile
   */
  determineClaim(data) {
    this.ai.updateStrategy(data.tile);
    return this.ai.determineClaim(data.tile);
  }

  /**
   * Process an awarded claim, leading to a reveal notification
   */
  processClaimAward(data) {
    var tile = parseInt(data.tile);
    var claim = data.claim;
    this.log('${this.name} was allowed to form a ${Constants.setNames[data.claim.claimType]} with tile ${tile}');

    // figure out what we were actually awarded
    var tiles = false;
    if(claim.claimType <= Constants.CHOW3) {
      if(claim.claimType === Constants.CHOW1) tiles = [tile,tile+1,tile+2];
      if(claim.claimType === Constants.CHOW2) tiles = [tile-1,tile,tile+1];
      if(claim.claimType === Constants.CHOW3) tiles = [tile-2,tile-1,tile];
    }
    else if(claim.claimType === Constants.WIN)  {
      tiles = [tile, tile];
    }
    else if(claim.claimType === Constants.PUNG) {
      tiles = [tile, tile, tile];
    }
    else if(claim.claimType === Constants.KONG) {
      tiles = [tile, tile, tile, tile];
    }

    // process and reveal the tiles
    this.revealed.push(tiles);
    this.tiles.push(tile);
    tiles.forEach(t => {
      let pos = this.tiles.indexOf(t);
      this.tiles.splice(pos,1);
    });

    if (claim.claimType === Constants.KONG) {
      this.socket.emit('kong-request', { tiles });
    }

    return tiles;
  }

  /**
   * ...
   */
  recordReveal(player, tiles) {
    this.ai.tracker.revealed(player, tiles);
    this.ai.updateStrategy();
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
    this.socket.emit("verify-result", {
      tiles: this.tiles,
      bonus: this.bonus,
      revealed: this.revealed,
      digest: digest(this.tiles, this.bonus, this.revealed)
    });
  }

  /**
   * Set up the listening side of the client protocol.
   */
  setSocketBindings(port, socket, afterBinding) {
    socket.on('connect', data => {
      this.log('connected on port ${port}');

      socket.on('getready', data => {
        this.log('instructed to get ready by the server on ${port}');
        this.setGameData(data);
        socket.emit('ready');
      });

      socket.on('initial-tiles', data => {
        this.log('initial tiles for ${this.name}: ', data.tiles);
        this.setInitialTiles(data.tiles);
      });

      socket.on('deal-bonus-compensation', data => {
        this.log('deal bonus compensation tiles for ${this.name}: ', data.tiles);
        this.processDealBonusTiles(data.tiles.map(v => parseInt(v)));
      })

      socket.on('turn-tile', data => {
        this.log(this.name, 'received turn tile: ', data.tile);
        this.checkDrawBonus(parseInt(data.tile));
      });

      socket.on('draw-bonus-compensation', data => {
        this.log('draw bonus compensation tile for ${this.name}: ', data.tile);
        this.checkDrawBonus(parseInt(data.tile));
      });

      socket.on('tile-discarded', data => {
        var claim = this.determineClaim(data);
        socket.emit('claim-discard', claim);
      });

      socket.on('claim-awarded', data => {
        var tiles = this.processClaimAward(data);
        socket.emit('set-revealed', { tiles });
      });

      socket.on('kong-compensation', data => {
        this.log('kong compensation tile for ${this.name}: ', data.tile);
        this.checkDrawBonus(parseInt(data.tile));
      });

      socket.on('player-revealed', data => {
        if (data.from == this.currentGame.position) {
          // if this is not a kong, we now need to discard something.
          if (data.tiles.length < 4) this.discardTile();
          // if it WAS a kong, we need to wait for our compensation tile.
        } else {
          this.recordReveal(data.from, data.tiles);
        }
      });

      socket.on('player-revealed-bonus', data => {
        // Necessary for interface updates, but we don't need
        // to do anything with this event in an interfaceless
        // client...
      });

      socket.on('hand-drawn', data => {
        this.log('${this.name} in seat ${this.currentGame.position} registered that the hand was a draw.');
        console.log(this.name, this.tiles, this.bonus, this.revealed);
        socket.emit('hand-acknowledged');
      });

      socket.on('hand-won', data => {
        var selfdrawn = data.selfdrawn ? '(self-drawn) ' : '';
        this.log('${this.name} in seat ${this.currentGame.position} registered that the hand was won ${selfdrawn}by player in seat ${data.winner}.');
        console.log(this.name, this.tiles, this.bonus, this.revealed);
        socket.emit('hand-acknowledged');
      });

      socket.on('hand-score', data => {
        this.processHandScore(data);
      });

      socket.on('verify', data => {
        this.verify(data);
      });
    });

    if (afterBinding) afterBinding();
  }
};

module.exports = Client;
