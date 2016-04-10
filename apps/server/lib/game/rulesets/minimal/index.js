var logger = require('../../../logger');
var Constants = require('../../../constants');
var Tiles = require('../../tiles');
var FSA = require('./fsa');
var scoreplayers = require('./scoring');

var Ruleset = function() {
  this.log = logger("rules");
};

Ruleset.prototype = {

  /**
   * Can this player claim the tile they want to claim for the purpose they indicated?
   */
  canClaim: function(player, tile, claimType, winType) {
    this.log("can",player.id,"claim tile",tile,"given tiles",player.tiles,"("+claimType+"/"+winType+")","?");

    if (claimType === Constants.PAIR && winType === Constants.PAIR) { return this.canClaimSet(player, tile, 1); }
    if (claimType <= Constants.CHOW3) { return this.canClaimChow(player, tile, claimType); }
    if (claimType === Constants.PUNG) { return this.canClaimSet(player, tile, 2); }
    if (claimType === Constants.KONG) { return this.canClaimSet(player, tile, 3); }
    if (claimType === Constants.WIN)  { return this.canClaimWin(player, tile, claimType, winType); }

    return false;
  },

  /**
   * check if this player can form a chow with the indicted tile
   * given the tiles that they currently hold.
   */
  canClaimChow: function(player, tile, claimType) {
    var suit = Tiles.getTileSuit(tile);
    if (suit >= Constants.HONOURS) return false;
    // check for connecting tiles in the same suit
    var fullsuit = Tiles.getSuitTiles(suit);
    var tpos = fullsuit.indexOf(tile);
    var tiles = player.tiles;
    if (claimType === Constants.CHOW1) {
      //this.log("chow1 with tpos",tpos,"in suit",suit,"tiles",tiles);
      return tpos+2<Constants.NUMMOD && tiles.indexOf(tile+1)>-1 && tiles.indexOf(tile+2)>-1;
    }
    if (claimType === Constants.CHOW2) {
      //this.log("chow2 with tpos",tpos,"in suit",suit,"tiles",tiles);
      return tpos>0 && tpos+1<Constants.NUMMOD && tiles.indexOf(tile-1)>-1 && tiles.indexOf(tile+1)>-1;
    }
    if (claimType === Constants.CHOW3) {
      //this.log("chow3 with tpos",tpos,"in suit",suit,"tiles",tiles);
      return tpos>1 && tiles.indexOf(tile-1)>-1 && tiles.indexOf(tile-2)>-1;
    }
    // we can't reasonably get here.
    return false;
  },

  /**
   * check if this player can form a set of size inhandcount+1 given
   * the tiles that they currently hold.
   */
  canClaimSet: function(player, tile, inhandcount) {
    var instances = 0;
    player.tiles.forEach((t,idx) => { if(t===tile) instances++; });
    return (instances >= inhandcount)
  },

  /**
   * Verifying a win is a complicated process, and is highly ruleset dependent.
   * This ruleset implements the simplest verification possible: does the player
   * have a way to form four sets and a pair? If so, their claim is deemed valid.
   */
  canClaimWin: function(player, tile, claimType, winType) {
    // 1. can we claim this thing, outside of winning?
    var claim = (claimType === Constants.WIN) ? winType : claimType;
    if (!this.canClaim(player, tile, claim, winType)) return false;

    this.log(player.id,"can claim",tile,", but can they win?");

    // 2. if so, what's left after we resolve that claim?
    player = {
      tiles: player.tiles.slice(),
      bonus: player.bonus.slice(),
      revealed: player.revealed.slice()
    };
    this.processClaim(player, tile, claimType, winType);

    // 3. Can we form any sort of winning pattern with those tiles?
    this.log("checking coverage wrt winnning");
    var covered = this.checkCoverage(player.tiles, player.bonus, player.revealed);
    this.log("winner?",covered);
    return covered;
  },

  /**
   * Determine which tiles to form a set with.
   */
  processClaim: function(player, tile, claimType, winType) {
    this.log("processing claim of tile",tile,"by player",player.id,"("+claimType+"/"+winType+")");
    var tiles = player.tiles, set;
    if (claimType === Constants.WIN   && winType === Constants.PAIR)  { set = this.formSet(tile, 2); }
    if (claimType === Constants.CHOW1 || winType === Constants.CHOW1) { set = this.formChow(tile, Constants.CHOW1); }
    if (claimType === Constants.CHOW2 || winType === Constants.CHOW2) { set = this.formChow(tile, Constants.CHOW2); }
    if (claimType === Constants.CHOW3 || winType === Constants.CHOW3) { set = this.formChow(tile, Constants.CHOW3); }
    if (claimType === Constants.PUNG  || winType === Constants.PUNG)  { set = this.formSet(tile, 3); }
    if (claimType === Constants.KONG) { set = this.formSet(tile, 4); }
    if (claimType === Constants.CONCEALED_KONG) {
      set = this.formSet(tile, 4);
      set.concealed = true;
    }

    console.log(claimType, winType, set);

    if (claimType !== Constants.CONCEALED_KONG) {
      tiles.push(tile);
    }

    set.forEach(tile => {
      var pos = tiles.indexOf(tile);
      tiles.splice(pos,1);
    });

    player.revealed.push(set);
  },

  awardWinningClaim: function(player, tile, claimType, winType) {
    this.log("processing winning claim of tile",tile,"by player",player.id,"("+claimType+"/"+winType+")");
    var tiles = player.tiles, set;
    if (winType === Constants.PAIR)  { set = this.formSet(tile, 2); }
    if (winType  <= Constants.CHOW3) { set = this.formChow(tile, winType); }
    if (winType === Constants.PUNG)  { set = this.formSet(tile, 3); }

    console.log(claimType, winType, set);

    tiles.push(tile);
    set.forEach(tile => {
      var pos = tiles.indexOf(tile);
      tiles.splice(pos,1);
    });

    player.revealed.push(set);
  },

  // utility function
  formChow: function(tile, chowtype) {
    if (chowtype === Constants.CHOW1) return [tile, tile+1, tile+2];
    if (chowtype === Constants.CHOW2) return [tile-1, tile, tile+1];
    if (chowtype === Constants.CHOW3) return [tile-2, tile-1, tile];
  },

  // utility function
  formSet: function(tile, howmany) {
    var set = [];
    while(howmany--) { set.push(tile); }
    return set;
  },

  /**
   * Check whether a given tiles + bonus + revealed situation grants a win
   */
  checkCoverage: function(tiles, bonus, revealed) {
    var sets = 4;
    var pair = 1;
    revealed.forEach(set => {
      if (set.length >= 3) sets--;
      if (set.length === 2) pair--;
    });

    this.log("sets:",sets,"pairs:",pair);

    if (sets<0) { this.log("more than four sets found in", revealed); return false; }
    if (pair<0) { this.log("multiple pairs found in", revealed); return false; }

    this.log("starting FSA check for this win");
    return FSA.check(tiles, pair, sets);
  },

  /**
   * Score a hand, if it ended in a win.
   */
  score: function(players, windoftheround) {
    return scoreplayers(players, windoftheround);
  },

  /**
   * determine player rotation when a hand is over.
   */
  rotate: function(won) {
    // we rotate [0,1,2,3] -> [1,2,3,0] if the hand was won.
    return won? 1 : 1;
    // we also rotate on a draw =)
  }

};

module.exports = Ruleset;
