var Statistics = {

  // Default availability count of 4 per tile.
  availability: (function() {
    var set = [];
    for(i=0; i<Constants.BONUS; i++) {
      set[i] = 4;
    }
    return set;
  }()),

  // Estimate the likelihood of getting each tile required.
  getLikelihoods: function(tileNumbers, wall, concealedTiles, players) {
    var likelihoods = [],
        n = wall.length,
        availability = this.availability.slice();
    // we can't draw tiles that we already have in our hand.
    concealedTiles.forEach(function(tileNumber) {
      availability[tileNumber]--;
    });
    // we can't draw tiles that have already been played
    wall.discards.forEach(function(tile) {
      availability[tile.tileNumber]--;
    });
    players.forEach(function(player) {
      player.hand.open.toTileNumbers().forEach(function(tileNumber) {
        availability[tileNumber]--;
      });
    });
    // so: what are the odds of getting these tile?
    tileNumbers.forEach(function(tileNumber) {
      if(!likelihoods[tileNumber]) {
        likelihoods[tileNumber] = availability[tileNumber] / n;
      }
    });
    return likelihoods;
  }
};
