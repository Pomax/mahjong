'use strict'

var Constants = require('../../core/constants');
var Tiles = require('../../core/tiles');
var rulesets = require('../../core/rules')
var digest = require('../../core/digest');

/**
 * A client without an interface
 */
class Client {
  constructor(name, port, afterBinding) {
    this.name = name;
    this.reset();
    var io = require('socket.io-client');
    console.log('connecting to port ${port}...');
    var socket = this.socket = io.connect('http://localhost:${port}');
    this.setSocketBindings(port, socket, afterBinding);
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
   * Add a tile to the client's hand
   */
  addTile(tile) {
    this.tiles.push(tile);

    this.ai.tracker.gained(this.currentGame.position, tile);
    this.ai.updateStrategy();
    this.discardTile(true);
  }

  /**
   * used by all protocol steps that involve 'getting a tile'
   */
  checkBonus() {
    var bonus = this.tiles.map(v => parseInt(v)).filter(t => t >= Constants.PLAYTILES);
    if (bonus.length > 0) {
      this.bonus = this.bonus.concat(bonus);
      this.tiles = this.tiles.map(v => parseInt(v)).filter(t => t < Constants.PLAYTILES);
      console.log('requesting compensation for bonus tiles ${bonus}');
    }
    this.socket.emit('bonus-request', { tiles: this.bonus });
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
      console.log(this.name, 'discarding: ', tile);
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
    console.log('${this.name} was allowed to form a ${Constants.setNames[data.claim.claimType]} with tile ${tile}');

    // figure out what we were actually awarded
    var tiles = false;
    if(claim.claimType <= Constants.CHOW3) {
      if(claim.claimType === Constants.CHOW1) tiles = [tile,tile+1,tile+2];
      if(claim.claimType === Constants.CHOW2) tiles = [tile-1,tile,tile+1];
      if(claim.claimType === Constants.CHOW3) tiles = [tile-2,tile-1,tile];
    }
    else if(data.claim.claimType === Constants.WIN)  {
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
    //console.log('${this.name} received score object',scoreObject);
  }

  /**
   * ...
   */
  verify(data) {
    var localDigest = digest(this.tiles, this.bonus, this.revealed);
    var match = (data.digest === localDigest);
    if (!match) {
      console.log("verification mismatch.");
      console.log("client:", this.tiles, this.bonus, this.revealed);
      console.log("server:", data.tiles, data.bonus, data.revealed);
    }
    this.socket.emit("verify-result", { tiles: this.tiles, bonus: this.bonus, revealed: this.revealed, match });
  }

  /**
   * Set up the listening side of the client protocol.
   */
  setSocketBindings(port, socket, afterBinding) {
    socket.on('connect', data => {
      console.log('connected on port ${port}');

      socket.on('getready', data => {
        console.log('instructed to get ready by the server on ${port}');
        this.setGameData(data);
        socket.emit('ready');
      });

      socket.on('initial-tiles', data => {
        console.log('initial tiles for ${this.name}: ', data.tiles);
        this.tiles = data.tiles.map(v => parseInt(v));
        this.checkBonus();
      });

      socket.on('bonus-compensation', data => {
        console.log('bonus compensation tiles for ${this.name}: ', data.tiles);
        this.tiles = this.tiles.concat(data.tiles.map(v => parseInt(v)));
        this.checkBonus();
      })

      socket.on('turn-tile', data => {
        console.log(this.name, 'received turn tile: ', data.tile);
        this.addTile(parseInt(data.tile));
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
        console.log('kong compensation tile for ${this.name}: ', data.tile);
        this.addTile(parseInt(data.tile));
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
        console.log('${this.name} in seat ${this.currentGame.position} registered that the hand was a draw.');
        socket.emit('hand-acknowledged');
      });

      socket.on('hand-won', data => {
        var selfdrawn = data.selfdrawn ? '(self-drawn) ' : '';
        console.log('${this.name} in seat ${this.currentGame.position} registered that the hand was won ${selfdrawn}by player in seat ${data.winner}.');
        console.log(this.tiles, this.bonus, this.revealed);
        socket.emit('hand-acknowledged');
      });

      socket.on('hand-score', data => {
        this.processHandScore(data);
      });

      socket.on('verify', data => {
        this.verify(data);
      });
    });

    afterBinding();
  }
};

module.exports = Client;
