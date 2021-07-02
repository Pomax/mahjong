/**
 * Build an object that represents "what we have"
 * so we can reason about what we might be able
 * to play for. E.g. if we have 3 chows, going for
 * a pung hand is probably not a good idea, and
 * if we have 10 tiles in one suit, and 1 tile
 * in the other two suits, we probably want to
 * try to get one suit hand.
 */
function buildStatsContainer(player) {
  let tiles = player.tiles.map(t => t.getTileFace()).sort();
  let locked = player.locked.map(s => s.map(t => t.getTileFace()).sort());
  let tileCount = (new Array(42)).fill(0);

  let suit = t => (t/9)|0;

  let stats = {
    cpairs: 0,   // connected pairs: {t,t+1} or {t,t+2}
    pairs: 0,
    chows: 0,
    pungs: 0,
    bigpungs: 0, // dragons, own wind, wotr
    tiles: 0,    // how many tiles total
    counts: {},  // tile->howmany tracking object
    numerals: 0,
    terminals: 0,
    honours: 0,
    winds: 0,
    dragons: 0,
    suits: [0, 0, 0],
    // Separate container specific to locked sets:
    locked: { chows: 0, pungs: 0, bigpungs: 0, tiles: 0, numerals: 0, suits: [0, 0, 0] }
  };

  // Analyse the locked sets and gather stats.
  locked.forEach(set => {
    let tileNumber = set[0];
    if (tileNumber === set[1]) {
      stats.pungs++;
      stats.locked.pungs++;
      if (tileNumber < 27) {
        stats.numerals += set.length;
        stats.locked.numerals += set.length;
        stats.suits[suit(tileNumber)]++;
        stats.locked.suits[suit(tileNumber)]++;
      }
      if (tileNumber + 27 === player.wind) {
        stats.bigpungs++;
        stats.locked.bigpungs++;
      }
      if (tileNumber + 27 === player.windOfTheRound) {
        stats.bigpungs++;
        stats.locked.bigpungs++;
      }
      if (tileNumber > 30) {
        stats.bigpungs++;
        stats.locked.bigpungs++;
      }
    } else {
      stats.chows++;
      stats.locked.chows++;
      stats.numerals += set.length;
      stats.locked.numerals += set.length;
      stats.suits[suit(tileNumber)]++;
      stats.locked.suits[suit(tileNumber)]++;
    }
    stats.tiles += set.length;
    stats.locked.tiles += set.length;
  });

  // Analyse our hand tiles and gather stats
  tiles.forEach(tileNumber => {
    if (tileNumber <= 26) {
      stats.numerals++;
      let face = (tileNumber%9);
      if (face===0 || face===8) stats.terminals++;
      stats.suits[suit(tileNumber)]++;
    } else {
      stats.honours++;
      if (26 < tileNumber && tileNumber <= 30) stats.winds++;
      if (30 < tileNumber && tileNumber <= 33) stats.dragons++;
    }
    tileCount[tileNumber]++;
    stats.tiles++;
    if (!stats.counts[tileNumber]) stats.counts[tileNumber] = 0;
    stats.counts[tileNumber]++;
  });

  // Finally, there are some checks that are easier to do
  // once we have the tile->howany stats available.
  tileCount.forEach((count,tileNumber) => {
    // because we care about chow potential, we have
    // to basically run a three-tile sliding window.
    if (count && tileNumber <= 24) {
      let c2, c3;
      let tsuit = suit(tileNumber);
      let t2 = tileNumber + 1;
      if (suit(t2)===tsuit) {
        c2 = tileCount[t2];
        let t3 = tileNumber + 2;
        if (suit(t3)===tsuit) {
          c3 = tileCount[t3];
        }
      }
      if (c2 && c3) stats.chows++;
      else if (c2 || c3) stats.cpairs++;
    }
    if (count===2) stats.pairs++;
    if (count>=3) {
      stats.pungs++;
      if (tileNumber + 27 === player.wind) { stats.bigpungs++; }
      if (tileNumber + 27 === player.windOfTheRound) { stats.bigpungs++; }
      if (tileNumber > 30) { stats.bigpungs++; }
    }
  });

  return stats;
}

export { buildStatsContainer };
