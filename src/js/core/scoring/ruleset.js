import { config } from "../../../config.js";
import { LimitHands } from "./limit-hands.js";
import { FaakLaakTable } from "./faan-laak-table.js";
import { tilesNeeded } from "../algorithm/tiles-needed.js";
import { PatternSet } from "../algorithm/pattern-set.js";

/**
 * The generic ruleset object that specific
 * rulesets can extend off of.
 */
class Ruleset {

  // helper functions
  getWindTile(wind) { return 27 + wind }
  ownFlower(tile, windTile) { return tile - 34 === windTile - 27 }
  ownSeason(tile, windTile) { return tile - 38 === windTile - 27 }
  allFlowers(bonus) { return [34, 35, 36, 37].every(t => bonus.indexOf(t) > -1); }
  allSeasons(bonus) { return [38, 39, 40, 41].every(t => bonus.indexOf(t) > -1); }

  constructor(
    scoretype,
    player_start_score,
    limit,
    points_for_winning,
    no_point_score,
    losers_settle_scores,
    east_doubles_up,
    selfdraw_pays_double,
    discard_pays_double,
    reverse_wind_direction,
    pass_on_east_win,
  ) {
    this.scoretype = scoretype;
    this.limits = new LimitHands();
    // Base values
    this.player_start_score = player_start_score;
    this.limit = limit;
    this.points_for_winning = points_for_winning;
    this.no_point_score = no_point_score;
    // Ruleset flags
    this.losers_settle_scores = losers_settle_scores;
    this.east_doubles_up = east_doubles_up;
    this.selfdraw_pays_double = selfdraw_pays_double;
    this.discard_pays_double = discard_pays_double;
    this.reverse_wind_direction = reverse_wind_direction;
    this.pass_on_east_win = pass_on_east_win;
    // do we need a faan/laak table?
    if (scoretype === Ruleset.FAAN_LAAK) {
      this.limit = limit[0];
      this.faan_laak_limits = limit;
      this.setupFaanLaakTable(no_point_score, limit);
    }
  }

  /**
   * This is its own function, so that subclasses can override it with different values.
   */
  setupFaanLaakTable(no_point_score, limits) {
    this.faan_laak_table = new FaakLaakTable(no_point_score, limits);
  }

  /**
   * calculate the actual number of points awarded under point/double rules.
   */
  getPointsDoubleLimit() {
    return this.limit;
  }

  /**
   * calculate the actual number of points awarded under point/double rules.
   */
  getFaanLaakLimit(selfdraw) {
    return this.faan_laak_table.get(0, selfdraw, true);
  }

  /**
   * perform standard Faan conversion
   */
  convertFaan(points, selfdraw, limit) {
    return this.faan_laak_table.get(points, selfdraw, limit);
  }

  /**
   * perform points/doubles conversion
   */
  convertPoints(points, doubles) {
    if (!points && this.no_point_score) points = this.no_point_score
    return points * (2 ** doubles);
  }

  /**
   * Limits may require faan/laak computation
   */
  getLimitPoints(selfdraw) {
    if (this.scoretype === Ruleset.POINTS_DOUBLES) return this.getPointsDoubleLimit();
    if (this.scoretype === Ruleset.FAAN_LAAK) return this.getFaanLaakLimit(selfdraw);
    console.error('unknown scoring type');
    return 0;
  }

  /**
   * The base ruleset covers two classic limit hands.
   */
  checkForLimit(allTiles, lockedSize) {
    if (allTiles.length < 14) return;
    const tiles = () => allTiles.slice().map(t => t|0).sort();
    if (this.limits.hasThirteenOrphans(tiles())) return `Thirteen orphans`;
    if (this.limits.hasNineGates(tiles(), lockedSize)) return `Nine gates`;
  }

  /**
   * Generate a limit hand object
   */
  generateLimitObject(limit, selfdraw) {
    return {
      limit: limit,
      log: [`Limit hand: ${limit}`],
      score: 0,
      doubles: 0,
      total: this.getLimitPoints(selfdraw)
    };
  }

  /**
   * Turn basic tilescores into score adjustments, by running
   * the "how much does the winner get" and "how much do the
   * losers end up paying" calculations.
   */
  settleScores(scores, winningplayer, eastplayer, discardpid) {
    console.debug(`%cSettling payment`, `color: red`);

    let adjustments = [0, 0, 0, 0];
    let eastWinFactor = (winningplayer === eastplayer) ? 2 : 1;
    let wscore = scores[winningplayer].total;
    let selfdraw = (discardpid===false);

    console.debug(`winning score: ${wscore}, double east? ${this.east_doubles_up}`);

    for (let i = 0; i < scores.length; i++) {
      if (i === winningplayer) continue;

      // every non-winner pays the winner.
      if (i !== winningplayer) {
        let difference = wscore;
        if (this.east_doubles_up) {
          let paysAsEast = (i === eastplayer) ? 2 : 1;
          difference *= Math.max(eastWinFactor, paysAsEast);
        }
        if ((this.discard_pays_double && i===discardpid) || (this.selfdraw_pays_double && selfdraw)) {
          difference *= 2;
        }
        adjustments[winningplayer] += difference;
        console.debug(`${winningplayer} gets ${difference} from ${i}`);
        adjustments[i] -= difference;
        console.debug(`${i} pays ${difference} to ${winningplayer}`);
      }

      if (!this.losers_settle_scores) continue;

      // If losers should settle their scores amongst
      // themselves, make that happen right here:
      for (let j = i + 1; j < scores.length; j++) {
        if (j === winningplayer) continue;

        let difference = (scores[i].total - scores[j].total);
        if (this.east_doubles_up) {
          let paysAsEast = (i === eastplayer) ? 2 : 1;
          difference *= paysAsEast;
        }
        console.debug(`${i} gets ${difference} from ${j}`);
        adjustments[i] += difference;
        console.debug(`${j} pays ${difference} to ${i}`);
        adjustments[j] -= difference;
      }
    }

    if (this.east_doubles_up) {
      if (winningplayer === eastplayer) scores[eastplayer].log.push(`Player won as East`);
      else scores[eastplayer].log.push(`Player lost as East`);
    }

    return adjustments;
  }

  // implemented by subclasses
  getPairValue() { return false; }
  getChowValue() { return false; }
  getPungValue() { return false; }
  getKongValue() { return false; }

  /**
   * ...docs go here...
   */
  _tile_score(set, windTile, windOfTheRoundTile) {
    let locked = set.locked;
    let concealed = set.concealed;
    let tiles = set.tiles();
    let tile = tiles[0];
    let names = config.TILE_NAMES;

    if (tiles.length === 2) return this.getPairValue(tile, locked, concealed, names, windTile, windOfTheRoundTile);
    if (tiles.length === 3) {
      if (tile !== tiles[1]) return this.getChowValue(tile, locked, concealed, names, windTile, windOfTheRoundTile);
      else return this.getPungValue(tile, locked, concealed, names, windTile, windOfTheRoundTile);
    }
    if (tiles.length === 4) return this.getKongValue(tile, locked, concealed, names, windTile, windOfTheRoundTile);
  }

  // implemented by subclasses
  checkBonusTilePoints(bonus, windTile, names, result) {}
  checkHandPatterns(scorePattern, windTile, windOfTheRoundTile, tilesLeft, result) {}
  checkWinnerHandPatterns(scorePattern, winset, selfdraw, windTile, windOfTheRoundTile, tilesLeft, scoreObject) {}

  // Aggregate all the points for individual sets into a single score object
  aggregateScorePattern(scorePattern, windTile, windOfTheRoundTile) {
    return scorePattern
      .map(set => this._tile_score(set, windTile, windOfTheRoundTile))
      .filter(v => v)
      .reduce((t, v) => {
        t.score += v.score;
        t.doubles += (v.doubles||0);
        t.log = t.log.concat(v.log);
        return t;
      },{ score: 0, doubles: 0, log: [] });
  }

  /**
   * ...docs go here...
   */
  getTileScore(scorePattern, windTile, windOfTheRoundTile, bonus, winset, winner=false, selfdraw=false, selftile=false, robbed=false, tilesLeft) {
    let names = config.TILE_NAMES;
    let result = this.aggregateScorePattern(scorePattern, windTile, windOfTheRoundTile);
    result.wind = windTile;
    result.wotr = windOfTheRoundTile;

    this.checkBonusTilePoints(bonus, windTile, names, result);
    this.checkHandPatterns(scorePattern, windTile, windOfTheRoundTile, tilesLeft, result);
    if (winner) {
      if (this.points_for_winning > 0) {
        result.score += this.points_for_winning;
        result.log.push(`${this.points_for_winning} for winning`);
      }
      this.checkWinnerHandPatterns(scorePattern, winset, selfdraw, selftile, robbed, windTile, windOfTheRoundTile, tilesLeft, result);
    }

    if (result.limit) {
      result.score = this.limit;
      result.doubles = 0;
      result.total = this.limit;
      result.log.push(`Limit hand: ${result.limit}`);
    } else {
      result.total = 0

      if (this.scoretype === Ruleset.POINTS_DOUBLES) {
        result.total = this.convertPoints(result.score, result.doubles);
        if (result.total > this.limit) {
          result.log.push(`Score limited from ${result.total} to ${this.limit}`);
          result.total = this.limit;
        }
      }

      if (this.scoretype === Ruleset.FAAN_LAAK) {
        result.total = this.convertFaan(result.score, selfdraw);
      }
    }

    return result;
  }

  /**
   * All possible flags and values necessary for performing scoring, used in checkWinnerHandPatterns
   */
  getState(scorePattern, winset, selfdraw, selftile, robbed, windTile, windOfTheRoundTile, tilesLeft) {
    // We start with some assumptions, and we'll invalidate them as we see more sets.
    let state = {
      chowhand: true,
      punghand: true,

      onesuit: true,
      honours: false,
      allhonours: true,
      terminals: true,
      allterminals: true,

      outonPair: true,
      pairTile: -1,
      majorPair: false,
      dragonPair: false,
      windPair: false,
      ownWindPair: false,
      wotrPair: false,

      ownWindPung: false,
      wotrPung: false,
      ownWindKong: false,
      wotrKong: false,

      chowCount: 0,
      windPungCount: 0,
      windKongCount: 0,
      dragonPungCount: 0,
      dragonKongCount: 0,
      concealedCount: 0,
      kongCount: 0,
      suit: false,
      selfdraw: selfdraw,
      robbed: robbed,
      lastTile: (tilesLeft<=0)
    };

    // classic limit hands
    state.allGreen = scorePattern.every(set => set.tiles().every(t => [1,2,3,5,7,31].indexOf(t) > -1));

    let tiles, tile, tilesuit;
    scorePattern.forEach(set => {
      if (!set.locked || set.concealed) state.concealedCount++;

      tiles = set.tiles();
      tile = tiles[0];
      tilesuit = (tile / 9) | 0;

      if (tile < 27) {
        if (state.suit === false) state.suit = tilesuit;
        else if (state.suit !== tilesuit) state.onesuit = false;
        if (tiles.some(t => (t%9) !== 0 && (t%9) !== 8)) {
          state.terminals = false;
          state.allterminals = false;
        }
        state.allhonours = false;
      } else {
        state.honours = true;
        state.allterminals = false;
      }

      if (tiles.length === 2) {
        if (winset) {
          let wintiles = winset.tiles();
          state.outonPair = (wintiles.length===2 && wintiles[0]===tiles[0]);
          state.pairTile = wintiles[0];
        }
        else if (!winset && selfdraw && tiles[0] === selftile) {
          state.outonPair = true;
          state.pairTile = selftile;
        }
        else {
          state.outonPair = false;

          if (tile > 26 && tile < 31) {
            state.windPair = true;
            state.majorPair = true;
          }
          if (tile > 30) {
            state.dragonPair = true;
            state.majorPair = true;
          }
          if (tile === windTile) {
            state.ownWindPair = true;
            state.majorPair = true;
          }
          if (tile === windOfTheRoundTile) {
            state.wotrPair = true;
            state.majorPair = true;
          }
        }
      }

      if (tiles.length === 3) {
        if (tile === tiles[1]) {
          if (tile > 26 && tile < 31) {
            state.windPungCount++;
            if (tile === windTile) state.ownWindPung = true;
            if (tile === windOfTheRoundTile) state.wotrPung = true;
          }
          if (tile > 30) state.dragonPungCount++;
          state.chowhand = false;
        } else {
          state.chowCount++;
          state.punghand = false;
        }
      }

      if (tiles.length === 4) {
        state.kongCount++;
        if (tile > 26 && tile < 31) {
          state.windKongCount++; // implies pung
          if (tile === windTile) state.ownWindKong = true; // implies windPunt
          if (tile === windOfTheRoundTile) state.wotrKong = true; // implies wotrKong
        }
        if (tile > 30) state.dragonKongCount++; // implies pung
        state.chowhand = false;
      }
    });

    return state;
  }

  /**
   * Scoring tiles means first seeing how many different
   * things can be formed with the not-revelead tiles,
   * and then for each of those things, calculate the
   * total hand score by adding in the locked tiles.
   *
   * Whichever combination of pattersn scores highest
   * is the score the player will be assigned.
   */
  scoreTiles(disclosure, id, windOfTheRound, tilesLeft) {
    console.debug("SCORE TILES", id, disclosure, windOfTheRound, tilesLeft);

    // Let's get the administrative data:
    let winner = disclosure.winner;
    let selfdraw = disclosure.selfdraw;
    let selftile = disclosure.selftile ? disclosure.selftile.getTileFace() : false;
    let robbed = disclosure.robbed;
    let tiles = disclosure.concealed;
    let locked = disclosure.locked;
    let bonus = disclosure.bonus;
    let winset = false;
    let windTile = this.getWindTile(disclosure.wind);
    let windOfTheRoundTile = this.getWindTile(windOfTheRound);
    let allTiles = tiles.slice();

    // Move kong tile concealments out of the tile datasets
    // and into the sets themselves, instead.
    locked = locked.map(set => {
      if (set.length === 4) {
        let ccount = set.reduce((tally,t) => tally + (t.isConcealed() ? 1 : 0), 0);
        if (ccount >= 3) set.concealed = `${ccount}`;
      }
      return set;
    });

    // TODO: SWITCH OVER THE ABOVE CODE TO PatternSet RATHER THAN PLAIN ARRAYS

    // And then let's see what our tile-examining
    // algorithm has to say about the tiles we have.
    let tileInformation = tilesNeeded(tiles, locked);
    let openCompositions = tileInformation.composed;

    // Then, flatten the locked sets from tile elements
    // to simple numerical arrays, but with the set
    // properties (locked/concealed) preserved:
    locked = locked.map(set => {
      let newset = PatternSet.fromTiles(set, true, set.concealed);
      allTiles.push(...set);
      if (!!set[0].isWinningTile()) winset = newset;
      return newset;
    });

    // If this is the winner, though, then we _know_ there is at
    // least one winning path for this person to have won.
    if (winner) {
      // first check for non-standard-pattern limit hands
      let limit = this.checkForLimit(allTiles, locked.reduce((t,s) => t + s.length, 0));
      if (limit) {
        config.log('limit hand');
        return this.generateLimitObject(limit, selfdraw);
      }

      // no limit: proceed to score hand based on normal win paths.
      openCompositions = tileInformation.winpaths;
    } else {
      // Do we even bother figuring out what the not-winner has?
      if (!this.losers_settle_scores) {
        config.log('losers do not require score computation');
        return { score: 0, doubles: 0, log: [], total: 0 };
      }

      // If there is nothing to be formed with the tiles in hand,
      // then we need to create an empty path, so that we at
      // least still compute score based on just the locked tiles.
      if(openCompositions.length === 0) openCompositions.push([]);
    }

    // Run through each possible interpetation of in-hand
    // tiles, and see how much they would score, based on
    // the getTileScore() function up above.
    let possibleScores = openCompositions.map(chain => {
      return this.getTileScore(
        chain.concat(winner ? [] : locked),
        windTile,
        windOfTheRoundTile,
        bonus,
        winset,
        winner,
        selfdraw,
        selftile,
        robbed,
        tilesLeft);
    });

    config.log('possible scores:', possibleScores);

    // And then make sure we award each player the highest score they're elligible for.
    let finalScore = possibleScores.sort( (a,b) => { a = a.total; b = b.total; return a - b; }).slice(-1)[0];
    config.log('final score:', finalScore);

    if (!finalScore) {
      disclosure.locked = disclosure.locked.map(set => set.map(tile => tile.values ? tile.values.tile : tile));
      console.log(disclosure);
      console.log(possibleScores);
      throw new Error("no score could be computed");
    }

    return finalScore;
  }

   /**
   * Determine how this hand could be improved
   */
  _determineImprovement(concealed, locked, composed, to_complete, tiletracker) {
    return [];
  }

  /**
   * ...docs go here...
   */
  determineImprovement(player, tilesLeft, winner=false) {
    let concealed = player.getTileFaces();
    let locked = player.locked;
    let data = this.scoreTiles({
      winner,
      wind: player.wind,
      concealed,
      locked,
      bonus: player.bonus
    }, player.id, player.windOfTheRound, tilesLeft);

    let { composed, to_complete } = player.tilesNeeded();
    data.improvement = this._determineImprovement(concealed, locked, composed, to_complete, player.tracker);
    return data;
  }
}

Ruleset.FAAN_LAAK = Symbol();
Ruleset.POINTS_DOUBLES = Symbol();

/**
 * Set up ruleset registration/fetching by name. Note that
 * we add spaces in between camelcasing to make things
 * easier to work with: `Ruleset.getRuleset("Chinese Classical")`
 * is just friendlier for human code maintainers/editors.
 */
(() => {
  let rulesets = {};

  Ruleset.register = function(RulesetClass) {
    let naturalName = RulesetClass.name.replace(/([a-z])([A-Z])/g, (_, b, c) => `${b} ${c}`);
    rulesets[naturalName] = new RulesetClass();
  };

  Ruleset.getRuleset = name => rulesets[name];

  Ruleset.getRulesetNames = () => Object.keys(rulesets);
})();


export { Ruleset };
