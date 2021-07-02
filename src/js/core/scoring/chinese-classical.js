import { config } from "../../../config.js";
import { Ruleset } from "./ruleset.js";

/**
 * Chinese Classical rules.
 */
class ChineseClassical extends Ruleset {

  constructor() {
    super(
      Ruleset.POINTS_DOUBLES,
      2000,  // start score
      1000,  // single limit
      10,    // 10 points for winning
      false, // no-point hand does not exist in this ruleset
      true,  // losers pay each other
      true,  // east doubles up
      false, // selfdraw wins do not pay double
      false, // discarding player does not pay double
      true,  // reverse wind direction
      false  // deal does not pass when east wins
    );
  }

  /**
   * What are considered point-scoring pairs in this ruleset?
   */
  getPairValue(tile, locked, concealed, names, windTile, windOfTheRoundTile) {
    if (tile > 30) return {
      score: 2,
      log: [ `2 for pair of dragons (${names[tile]})` ]
    };

    if (tile === windTile) return {
      score: 2,
      log: [ `2 for pair of own wind (${names[tile]})` ]
    };

    if (tile === windOfTheRoundTile) return {
      score: 2,
      log: [ `2 for pair of wind of the round (${names[tile]})` ]
    };
  }

  /**
   * What are considered point-scoring pungs in this ruleset,
   * and do those incur any doubles?
   */
  getPungValue(tile, locked, concealed, names, windTile, windOfTheRoundTile) {
    let prefix = (locked && !concealed) ? "" : "concealed ";
    let value = 0;

    if (tile>30) {
      value = locked ? 4 : 8;
      return {
        score: value,
        doubles: 1,
        log: [
          `${value} for ${prefix}pung of dragons (${names[tile]})`,
          `1 double for pung of dragons (${names[tile]})`
        ]
      };
    }

    if (tile > 26) {
      value = locked ? 4 : 8;
      let scoreObject = {
        score: value,
        doubles: 0,
        log: [ `${value} for ${prefix}pung of winds (${names[tile]})` ]
      };
      if (tile === windTile) {
        scoreObject.doubles += 1;
        scoreObject.log.push(`1 double for pung of player's own wind (${names[tile]})`);
      }
      if (tile === windOfTheRoundTile) {
        scoreObject.doubles += 1;
        scoreObject.log.push(`1 double for pung of wind of the round (${names[tile]})`);
      }
      return scoreObject;
    }

    if (tile < 27) {
      let type;
      if (tile % 9 === 0 || tile % 9 === 8) {
        type = `terminals`;
        value = locked ? 4 : 8;
      } else {
        type = `simple`;
        value = locked ? 2 : 4;
      }
      return {
        score: value,
        log: [ `${value} for ${prefix}pung of ${type} (${names[tile]})` ]
      };
    }
  }

  /**
   * What are considered point-scoring kongs in this ruleset,
   * and do those incur any doubles?
   */
  getKongValue(tile, locked, concealed, names, windTile, windOfTheRoundTile) {
    let value = 0;

    // Is this a melded kong (locked, not concealed), a
    // claimed kong (locked, concealed=3 for pung), or
    // a self-drawn kong (locked, concealed=4 for kong)?
    let prefix = ``;
    let ccount = concealed;
    if (!ccount) prefix = `melded `;
    else if (ccount === 3) prefix = `claimed `;
    else if (ccount === 4) prefix = `concealed `;

    if (tile>30) {
      value = (locked || ccount===3) ? 16 : 32;;
      return {
        score: value,
        doubles: 1,
        log: [
          `${value} for ${prefix}kong of dragons (${names[tile]})`,
          `1 double for kong of dragons (${names[tile]})`
        ]
      };
    }

    if (tile > 26) {
      value = (locked || ccount===3) ? 16 : 32;
      let scoreObject = {
        score: value,
        doubles: 0,
        log: [ `${value} for ${prefix}kong of winds (${names[tile]})` ]
      };
      if (tile === windTile) {
        scoreObject.doubles += 1;
        scoreObject.log.push(`1 double for kong of player's own wind (${names[tile]})`);
      }
      if (tile === windOfTheRoundTile) {
        scoreObject.doubles += 1;
        scoreObject.log.push(`1 double for kong of wind of the round (${names[tile]})`);
      }
      return scoreObject;
    }

    if (tile < 27) {
      let type;
      if (tile % 9 === 0 || tile % 9 === 8) {
        type = `terminals`;
        value = (locked || ccount===3) ? 16 : 32;
      } else {
        type = `simple`;
        value = (locked || ccount===3) ? 8 : 16;
      }
      return {
        score: value,
        log: [ `${value} for ${prefix}kong of ${type} (${names[tile]})` ]
      };
    }
  }

  /**
   * There are special points and doubles that any player
   * can get at the end of the hand. Calculate those here:
   */
  checkHandPatterns(scorePattern, windTile, windOfTheRoundTile, tilesLeft, scoreObject) {
    // this ruleset only awards points for little three dragons.
    let r, g, w;

    scorePattern.forEach(set => {
      let tile = set[0];
      if (tile===31) g = set.length;
      if (tile===32) r = set.length;
      if (tile===33) w = set.length;
    });

    if (r + g + w >= 8 && (r===2 || g===2 || w===2)) {
      scoreObject.doubles += 1;
      scoreObject.log.push(`1 double for little three dragons`);
    }
  }

  /**
   * There are special points and doubles that you can only
   * get by winning the hand. Calculate those here:
   */
  checkWinnerHandPatterns(scorePattern, winset, selfdraw, selftile, robbed, windTile, windOfTheRoundTile, tilesLeft, scoreObject) {
    let names = config.TILE_NAMES;
    let suits = config.SUIT_NAMES;
    let state = this.getState(scorePattern, winset, selfdraw, selftile, robbed, windTile, windOfTheRoundTile, tilesLeft);

    if (state.selfdraw) {
      scoreObject.score += 2;
      scoreObject.log.push(`2 for self-drawn win (${names[selftile]})`);
    }

    if (state.robbed) {
      scoreObject.doubles += 1;
      scoreObject.log.push(`1 double for robbing a kong (${names[winset[0]]})`);
    }

    if (state.outonPair) {
      scoreObject.score += 2;
      scoreObject.log.push(`2 for winning on a pair (${names[state.pairTile]})`);
    }

    if (state.outonPair && state.majorPair) {
      scoreObject.score += 2;
      scoreObject.log.push(`2 for winning on a major pair`);
    }

    if (state.chowhand && !state.majorPair) {
      scoreObject.doubles += 1;
      scoreObject.log.push(`1 double for chow hand`);
    }

    if (state.onesuit) {
      if (state.honours) {
        scoreObject.doubles += 1;
        scoreObject.log.push(
          `1 double for one suit (${suits[state.suit]}) and honours hand`
        );
      } else {
        scoreObject.doubles += 3;
        scoreObject.log.push(`3 doubles for clean one suit hand (${suits[state.suit]})`);
      }
    }

    if (state.allterminals) {
      scoreObject.limit = `all terminals hand`;
    }

    if (state.allhonours) {
      scoreObject.limit = `all honours hand`;
    }

    if (state.terminals && state.honours) {
      scoreObject.doubles += 1;
      scoreObject.log.push(`1 double for terminals an honours hand`);
    }

    if (state.punghand) {
      scoreObject.doubles += 1;
      scoreObject.log.push(`1 double for all pung hand`);
    }

    if (state.kongCount === 4) {
      scoreObject.limit = `All kong hand`;
    }

    if (state.dragonPungCount + state.dragonKongCount === 3) {
      scoreObject.limit = `Three great scholars (pung or kong of each dragon)`;
    }

    if (state.windPungCount + state.windKongCount === 3 && state.windPair) {
      scoreObject.limit = `Little four winds (pung or kong of three wind, pair of last wind)`;
    }

    if (state.windPungCount + state.windKongCount === 4) {
      scoreObject.limit = `Big four winds (pung or kong of each wind)`;
    }

    if (state.concealedCount === 5) {
      scoreObject.doubles += 1;
      scoreObject.log.push(`1 double for fully concealed hand`);
    }

    if (state.concealedCount === 5 && state.punghand) {
      scoreObject.limit = `Fully concealed pung hand`;
    }

    if (state.lastTile) {
      scoreObject.doubles += 1;
      if (selfdraw) {
        scoreObject.log.push(
          `1 double for winning with the last available wall tile`
        );
      } else {
        scoreObject.log.push(`1 double for winning with the last discard`);
      }
    }

    if (state.allGreen) {
      scoreObject.limit = `"All Green" (bamboos 2, 3, 4, 6, 8 and/or green dragons)`;
    }
  }

  /**
   * Award points based on bonus tiles. A flat 4 points per
   * bonus, but Chinese classical also awards some doubles
   * based on having specific flowers/seasons.
   */
  checkBonusTilePoints(bonus, windTile, names, result) {
    let hasOwnFlower = false;
    let hasOwnSeason = false;

    bonus.forEach(tile => {
      result.score += 4;
      result.log.push(`4 for bonus tile (${names[tile]})`);
      if (this.ownFlower(tile, windTile)) hasOwnFlower = true;
      if (this.ownSeason(tile, windTile)) hasOwnSeason = true;
    });

    if (hasOwnFlower && hasOwnSeason) {
      result.doubles += 1;
      result.log.push(`1 double for own flower and season`);
    }

    if (this.allFlowers(bonus)) {
      result.doubles += 2;
      result.log.push(`1 double for having all flowers`);
    }

    if (this.allSeasons(bonus)) {
      result.doubles += 2;
      result.log.push(`1 double for having all seasons`);
    }
  }
}

// register as a ruleset
Ruleset.register(ChineseClassical);

export { ChineseClassical };
