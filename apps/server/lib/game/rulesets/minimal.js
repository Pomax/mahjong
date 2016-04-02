var logger = require('../../logger');
var Constants = require('../../constants');
var Tiles = require('../tiles');

var Ruleset = function() {
  this.log = logger("rules");
};

Ruleset.prototype = {

  /**
   * Can this player claim the tile they want to claim for the purpose they indicated?
   */
  canClaim: function(player, tile, claimType, winType) {
    this.log("can",player.id,"claim tile",tile,"given tiles",player.tiles,"?");
    if (claimType === Constants.PAIR && winType === Constants.PAIR) { return this.canClaimSet(player, tile, 1); }
    if (claimType <= Constants.CHOW3) { return this.canClaimChow(player, tile, claimType); }
    if (claimType === Constants.PUNG) { return this.canClaimSet(player, tile, 2); }
    if (claimType === Constants.KONG) { return this.canClaimSet(player, tile, 3); }
    if (claimType === Constants.WIN)  { return this.canClaimWin(player, tile, winType); }
    return false
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
   * This is a complicated function, and is highly ruleset dependent.
   */
  canClaimWin: function(player, tile, winType) {
    // FIXME: TODO: implement properly based on rulesets.

    // 1. can we claim this thing, outside of winning?
    var claimable = this.canClaim(tile, winType);

    // 2. if so, what's left after we resolve that claim?
    var remainder = [];

    // 3. Can we form any sort of winning pattern with those tiles?
    var covers = this.checkCoverage(remainder,setsNeeder,pairNeeded);

    // if we can, this is a legal win claim.
    return covers;
  },

  /**
   * Determine which tiles to form a set with.
   */
  processClaim: function(player, tile, claimType, winType) {
    this.log("processing claim of tile",tile,"by player",player.id);
    var tiles = player.tiles, set;
    if (claimType === Constants.WIN   && winType === Constants.PAIR)  { set = this.formSet(tile, 2); }
    if (claimType === Constants.CHOW1 || winType === Constants.CHOW1) { set = this.formChow(tile, claimType); }
    if (claimType === Constants.CHOW2 || winType === Constants.CHOW2) { set = this.formChow(tile, claimType); }
    if (claimType === Constants.CHOW3 || winType === Constants.CHOW3) { set = this.formChow(tile, claimType); }
    if (claimType === Constants.PUNG  || winType === Constants.PUNG)  { set = this.formSet(tile, 3); }
    if (claimType === Constants.KONG) { set = this.formSet(tile, 4); }

    tiles.push(tile);
    set.forEach(tile => {
      var pos = tiles.indexOf(tile);
      tiles.splice(pos,1);
    });

    player.revealed.push(set);
    this.log("set:", set);
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
  }

};

module.exports = Ruleset;
