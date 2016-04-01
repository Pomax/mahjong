/**
 *
 */
var Scoring = function(){};

Scoring.prototype = {
  score: function(concealed, values, open) {
    var $ = this,
        score = 0,
        setCount = 4,
        ctiles = concealed.toTileNumbers();
    open.sets.forEach(function(set) {
      score += scoreSet(set);
      setCount--;
    });
    var i=-1, possibles = values.map(function(v) {
      i++;
      switch(Tiles.getClaimType(v)) {
        case Constants.CHOW: return $.scoreChow([ctiles[i]], true);
        case Constants.PUNG: return $.scorePung([ctiles[i]], true);
        case Constants.KONG: return $.scoreKong([ctiles[i]], true);
      }
      return 0;
    });
    console.log("possibles: " + possibles);
    // get the best values for however many sets we need to complete the hand.
    possibles.sort(function(a,b) { return b-a; }).slice(0,setCount).forEach(function(v) {
      score += v;
    });
    // ignore the pair, for the moment.
    return score;
  },
  scoreSet: function(set) {
    var isset = (set instanceof Set),
        tiles = set.tiles,
        tileCount = tiles.length;
    if(!isset) { return this.scoreChow(tiles); }
    switch(tileCount) {
      case 2: return this.scorePair(tiles);
      case 3: return this.scorePung(tiles);
      case 4: return this.scoreKong(tiles);
    }
    return 0;
  },
  scorePair: function(tiles, concealed) {
    return 0;
  },
  scoreChow: function(tiles, concealed) {
    return 0;
  },
  scorePung: function(tiles, concealed) {
    var honour = Tiles.isHonour(tiles[0]);
        score = 2;
    if (honour) score *= 2;
    if (concealed) score *= 2;
    return score;
  },
  scoreKong: function(tiles, concealed) {
    var honour = Tiles.isHonour(tiles[0]),
        score = 4;
    if (honour) score *= 2;
    if (concealed) score *= 2;
    return score;
  },
  scoreBonus: function(tiles) {
    return 4 * tiles.length;
  }
};
