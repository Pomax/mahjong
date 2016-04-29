var Constants = require('../../constants');
var Tiles = require('../../tiles');
var FSA = require('./fsa');

// simple scoring:
//
//   1) the winner receives their tilescore from each other player
//   2) other players do not settle scores amongst themselves.
//   3) east does not win/lose double
//
// points awarded:
//
//   winning: 0
//   chow: 0
//   pung:
//     simple: 1
//     honour: 2
//   kong:
//     simple: 2
//     honour: 4
//   bonus tiles: 1 each
//
//   (tiles-in-hand score double the points)
//
// Illegal win:
//
//   player pays all other players 3 points.
//
var Scores = {
  WIN:  0,
  PAIR: 0,
  CHOW: 0,
  PUNG: 1,
  KONG: 2,
  HONOUR_MULTIPLIER: 2,
  CONCEALED_MULTIPLIER: 2,
  ILLEGAL_WIN: -5
};

function scoreSet(set, open, log) {
  var logEntry = log.length;
  var score = 0;
  if (set.length < 3) {
    log.push("pair");
    score = Scores.PAIR;
  }
  else if (set[0] !== set[1]) {
    log.push("chow");
    score = Scores.CHOW;
  }
  else {
    if (set[0] < Constants.HONOURS) {
      log.push("pung");
      score = Scores.PUNG;
    } else {
      log.push("pung of honours");
      score = Scores.HONOUR_MULTIPLIER * Scores.PUNG;
    }
    if (set.length === 4) {
      log[logEntry] = log[logEntry].replace('pung', 'kong');
      score *= Scores.KONG/Scores.PUNG;
    }
  }
  log[logEntry] = log[logEntry] + ": " + score;

  if (!open) {
    log[logEntry] = log[logEntry] + " (x"+Scores.CONCEALED_MULTIPLIER+" for concealed)";
    score *= Scores.CONCEALED_MULTIPLIER;
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
  return tilescores.map((scoreObj,pid) => {
    if(pid===winner) { scoreObj.score = winningScore * 3; }
    else {
      scoreObj.from.push("pay winner: " + (-winningScore));
      scoreObj.score = -winningScore;
    }
    return scoreObj;
  });
}

scorePlayers.processIllegalWin = function(players, player) {
  return players.map((p,pid) => {
    if (p===player) {
      return {
        score: 3 * Scores.ILLEGAL_WIN,
        pid,
        log: ['declared illegal win: ' + Scores.ILLEGAL_WIN + " (x3)"]
      };
    }
    return {
      score: -Scores.ILLEGAL_WIN,
      pid,
      log: ['player '+pid+' declared illegal win: ' + (-Scores.ILLEGAL_WIN)]
    };
  });
};

module.exports = scorePlayers;
