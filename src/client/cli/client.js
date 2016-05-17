'use strict'

var inquirer = require('inquirer');
var colors = require('colors');

var Constants = require('../../core/constants');
var Tiles = require('../../core/tiles');
var rulesets = require('../../core/rules')
var digest = require('../../core/digest');
var version = require('../../../package.json').version;

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

    console.log('');
    console.log('  ███╗   ███╗ █████╗ ██╗  ██╗     ██╗ ██████╗ ███╗   ██╗ ██████╗ ');
    console.log('  ████╗ ████║██╔══██╗██║  ██║     ██║██╔═══██╗████╗  ██║██╔════╝ ');
    console.log('  ██╔████╔██║███████║███████║     ██║██║   ██║██╔██╗ ██║██║  ███╗');
    console.log('  ██║╚██╔╝██║██╔══██║██╔══██║██   ██║██║   ██║██║╚██╗██║██║   ██║');
    console.log('  ██║ ╚═╝ ██║██║  ██║██║  ██║╚█████╔╝╚██████╔╝██║ ╚████║╚██████╔╝');
    console.log('  ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚════╝  ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝ ');
    console.log('                                                  Version ${version}\n');
  }

  log() {
    if(debug) console.log.apply(console, arguments);
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
    this.currentGame.tile = 0;
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
    this.currentGame.tile++;
    console.log('You drew tile ${Tiles.getShortForm(tile)}');
    this.tiles.push(tile);
    this.ai.tracker.gained(this.currentGame.position, tile);
    this.ai.updateStrategy();
    this.discardTileManually(true);
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
   * The puny human manual discard system
   */
  discardTileManually(cleandeal) {
    function colorize(sets) {
      var replace = (t) => {
        if (t.length===1) {
          if (t==='c') return colors.red.bgWhite('C');
          if (t==='f') return colors.green.bgWhite('F');
          return colors.blue.bgWhite(t.toUpperCase());
        }
        if (t.indexOf('b')===0) return colors.green.bgWhite(t.replace('b',''));
        if (t.indexOf('c')===0) return colors.red.bgWhite(t.replace('c',''));
        if (t.indexOf('d')===0) return colors.blue.bgWhite(t.replace('d',''));
        if (t.indexOf('s')===0) return colors.red.bgWhite(t.replace('s',''));
        if (t.indexOf('f')===0) return colors.blue.bgWhite(t.replace('f',''));
      };
      sets.forEach(set => set.forEach((t,i) => set[i] = replace(t) ));
    };

    var tiles = this.tiles;
    var tileSituation = [colors.green('[hand ${this.currentGame.handid}, tile ${this.currentGame.tile}]\n')];
    this.players.forEach(player => {
      let information = [colors.black.bgWhite('[${Tiles.getPositionWind(player.position)}]') + ' ${player.name}:'];
      if (player.position === this.currentGame.position) {
        var playtiles = tiles.sort(Constants.sort).map(tile => Tiles.getShortForm(tile));
        var revealed = "nothing on the table,";
        if (this.revealed.length>0) {
          revealed = this.revealed.map(set => set.map(tile => Tiles.getShortForm(tile)));
        }
        var bonus = "no bonus tiles";
        if (this.bonus.length>0) {
          bonus = this.bonus.map(tile => Tiles.getShortForm(tile));
        }
        colorize([playtiles, bonus]);
        information = information.concat([ playtiles.join(''), '-', revealed, bonus ]);
      } else {
        var revealed = "nothing on the table,";
        if (player.revealed.length>0) {
          revealed = '[' + player.revealed.map(set => set.map(tile => Tiles.getShortForm(tile)).join(',')).join('|') + '] on the table,';
        }
        var bonus = "no bonus tiles";
        if (player.bonus.length>0) {
          bonus = 'bonus tiles: ' + player.bonus.map(tile => Tiles.getShortForm(tile)).join(',');
        }
        information = information.concat(['${player.handSize} tiles in hand,', revealed, bonus ]);
      }
      tileSituation = tileSituation.concat(information.join(' '));
    });
    tileSituation.push("Your discard?");

    tileSituation = tileSituation.join('\n');

    inquirer
    .prompt([{
      type: 'input',
      name: 'tile',
      message: tileSituation + ':',
      validate: function (value) {
        let msg = 'Please type a tile in your hand';
        if (!value) return msg;
        if (value === 'q') process.exit(1);
        let tile = Tiles.fromShortForm(value);
        if (tile === Constants.NOTILE) return true;
        if (tiles.indexOf(tile) === -1) return msg;
        return true;
      }
    }])
    .then(answers => {
      var tile = Tiles.fromShortForm(answers.tile);
      if (tile !== Constants.NOTILE) {
        var pos = this.tiles.indexOf(tile);
        this.tiles.splice(pos,1);
        this.log(this.name, 'discarding: ', tile);
      }
      this.socket.emit('discard-tile', { tile });
    });
  }

  /**
   * Determine whether we want to claim a discarded tile
   */
  determineClaim(data) {
    var player = this.players[parseInt(data.from)];
    console.log('saw discard for ${Tiles.getShortForm(data.tile)} by ${player.name} in seat ${player.position}');
    this.ai.updateStrategy(data.tile);
    return this.ai.determineClaim(data.tile);
  }

  /**
   * The puny human claim system
   */
  determineClaimManually(data, aiclaim, sendClaim) {
    var tile = parseInt(data.tile);
    var shortform = Tiles.getShortForm(tile);
    inquirer
    .prompt([{
      type: 'input',
      name: 'claim',
      message: 'Claim tile (${shortform})? [y/n]',
      validate: function (value) {
        let msg = 'yes or no?';
        if (value.toLowerCase() === 'y') return true;
        if (value.toLowerCase() === 'n') return true;
        if (value === '') return true;
        return false;
      }
    }])
    .then(answers => {
      var options = ['chow1','chow2','chow3','pung','kong','win','nothing'];
      if (answers.claim === '') answers.claim = 'n';
      if (answers.claim.toLowerCase() === 'y') {
        inquirer
        .prompt([{
          type: 'input',
          name: 'claimType',
          message: 'as what? [${options.join(",")}]:',
          validate: function (value) {
            if (options.indexOf(value.toLowerCase())===-1) return 'you need to pick one...';
            return true;
          }
        }])
        .then(answers => {
          var claimTypes = {
            chow1: Constants.CHOW1,
            chow2: Constants.CHOW2,
            chow3: Constants.CHOW3,
            pung: Constants.PUNG,
            kong: Constants.KONG,
            win: Constants.WIN,
            nothing: Constants.NOTHING
          }
          var claimType = claimTypes[answers.claimType];
          if (claimType === Constants.WIN) {
            var wintypes = ['chow1','chow2','chow3','pung','pair','nothing'];
            inquirer
            .prompt([{
              type: 'input',
              name: 'winType',
              message: 'What are you winning on? [${wintypes.join(",")}]:',
              validate: function (value) {
                if (wintypes.indexOf(value.toLowerCase())===-1) return 'you need to pick one...';
                return true;
              }
            }])
            .then(answers => {
              var winTypes = {
                chow1: Constants.CHOW1,
                chow2: Constants.CHOW2,
                chow3: Constants.CHOW3,
                pair: Constants.PAIR,
                pung: Constants.PUNG,
                nothing: Constants.NOTHING
              }
              var winType = winTypes[answers.winType];
              sendClaim({ claimType: Constants.WIN, winType });
            });
          }
          else { sendClaim({ claimType }); }
        });
      }
      else { sendClaim({ claimType: Constants.NOTHING }); }
    });
  }

  /**
   * Process an awarded claim, leading to a reveal notification
   */
  processClaimAward(data) {
    this.currentGame.tile++;

    var tile = parseInt(data.tile);
    var claim = data.claim;
    console.log('${this.name} was allowed to form a ${Constants.setNames[data.claim.claimType]} with tile ${tile}');

    // figure out what we were actually awarded
    var tiles = false;
    if(claim.claimType <= Constants.CHOW3) {
      if(claim.claimType === Constants.CHOW1) { tiles = [tile,tile+1,tile+2]; }
      if(claim.claimType === Constants.CHOW2) { tiles = [tile-1,tile,tile+1]; }
      if(claim.claimType === Constants.CHOW3) { tiles = [tile-2,tile-1,tile]; }
    }
    else if(claim.claimType === Constants.PUNG) { tiles = [tile, tile, tile]; }
    else if(claim.claimType === Constants.KONG) { tiles = [tile, tile, tile, tile]; }
    else if(claim.claimType === Constants.WIN)  {
      if(claim.winType === Constants.PAIR)  { tiles = [tile, tile]; }
      if(claim.winType === Constants.CHOW1) { tiles = [tile,tile+1,tile+2]; }
      if(claim.winType === Constants.CHOW2) { tiles = [tile-1,tile,tile+1]; }
      if(claim.winType === Constants.CHOW3) { tiles = [tile-2,tile-1,tile]; }
      if(claim.winType === Constants.PUNG)  { tiles = [tile, tile, tile]; }
      if(claim.winType === Constants.KONG)  { tiles = [tile, tile, tile, tile]; }
    }

    console.log(data);

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
  recordReveal(playerPosition, tiles) {
    this.ai.tracker.revealed(playerPosition, tiles);
    this.ai.updateStrategy();
    var player = this.players[playerPosition];
    console.log('${player.name} claimed the discard to form', tiles.map(tile => Tiles.getShortForm(tile)));
    player.revealed.push(tiles);
    player.handSize -= tiles.length;
  }

  /**
   * ..
   */
  recordBonus(playerPosition, tiles) {
    var player = this.players[playerPosition];
    console.log('${player.name} received bonus tile(s) ', tiles.map(tile => Tiles.getShortForm(tile)));
    player.bonus = player.bonus.concat(tiles);
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

      // FIXME: TEMPORARY BUT NECESSARY DUE TO THE UNINTERRUPTIBILITY OF PROMISES
      socket.emit('disable-claim-timeout');
      // FIXME: TEMPORARY BUT NECESSARY DUE TO THE UNINTERRUPTIBILITY OF PROMISES

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
        var from = data.from;
        if (parseInt(from) === this.currentGame.position) {
          return socket.emit('claim-discard', { claimType: Constants.NOTHING });
        }
        // AI-backed claim.
        var claim = this.determineClaim(data);
        this.determineClaimManually(data, claim, claim => {
          socket.emit('claim-discard', claim);
        });
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
          if (data.tiles.length < 4) this.discardTileManually();
          // if it WAS a kong, we need to wait for our compensation tile.
        } else {
          this.recordReveal(parseInt(data.from), data.tiles);
        }
      });

      socket.on('player-revealed-bonus', data => {
        this.recordBonus(parseInt(data.by), data.tiles)
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
