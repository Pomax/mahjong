var Constants = require('../../../constants');
var Tiles = require('../../tiles');
var FSA = require('./fsa');

// simple scoring:
//
// 1) the winner receives their tilescore from each other player
// 2) other players do not settle scores amongst themselves.
// 3) east does not win/lose double
//
// points awarded:
//
//  winning: 0
//  chow: 0
//  pung:
//    simple: 1
//    honour: 2
//  kong:
//    simple: 2
//    honour: 4
//  bonus tiles: 1 each
//
//  tiles-in-hand score double the points
//

function scoreSet(set, open, log) {
  var logEntry = log.length;
  var score = 0;
  if (set.length < 3) {
    log.push("pair");
    score = 0;
  }
  else if (set[0] !== set[1]) {
    log.push("chow");
    score = 0;
  }
  else {
    if (set[0] < Constants.HONOURS) {
      log.push("pung");
      score = 1;
    } else {
      log.push("pung of honours");
      score = 2;
    }
    if (set.length === 4) {
      log[logEntry] = log[logEntry].replace('pung', 'kong');
      score *= 2;
    }
  }
  log[logEntry] = log[logEntry] + ": " + score;

  if (!open) {
    log[logEntry] = log[logEntry] + " (x2 for concealed)";
    score *= 2;
  }
  return score;
}

function scoreSets(sets, playerwind, windoftheround, open, log) {
  return sets.map(s => scoreSet(s, open, log)).reduce((a,b) => a+b, 0);
}

function scoreConcealed(tiles, haspillow, playerwind, windoftheround, log) {
  // we need to form all possible set/pair combinations that
  // these tiles can form, and then score all of them, picking
  // the highest value as the "scored" value.
  var tree = FSA.generate(tiles.slice(), haspillow ? 0 : 1);
  var collections = tree.getAllValuePaths();
  var possibleScores = collections.map(sets => {
    var templog = [];
    return {
      score: scoreSets(sets, playerwind, windoftheround, false, templog),
      log: templog
    };
  });
  var best = possibleScores.sort((a,b) => b.score - a.score)[0];
  best.log.forEach(entry => log.push(entry));
  return best.score;
}

function getTileScores(player, windoftheround) {
  var log = [];
  var rscore = scoreSets(player.revealed, player.wind, windoftheround, true, log);
  var haspillow = player.revealed.some(set => set.length===2);
  var cscore = scoreConcealed(player.tiles, haspillow, player.wind, windoftheround, log);
  var bscore = player.bonus.length;
  if (bscore) { log.push("bonus tiles: " + bscore); }

  return {
    score: (rscore + cscore + bscore),
    from: log
  };
}

function scorePlayers(players, windoftheround) {
  var tilescores = players.map(player => getTileScores(player, windoftheround));

  var winner = -1;
  players.forEach((p,pid) => { if(p.winner) { winner = pid; }} );

  var winningScore = tilescores[winner].score;
  // winner gets 3x what they won with, losers get nothing =(
  return tilescores.map((_,pid) => {
    if(pid===winner) { _.score = winningScore * 3; }
    else {
      _.from.push("pay winner: " + (-winningScore))
      _.score = -winningScore;
    }
    return _;
  });
};

module.exports = scorePlayers;
