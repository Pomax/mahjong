import { config } from "../../../config.js";
import { Ruleset } from "./ruleset.js";

/**
 * Cantonese rules.
 */
class Cantonese extends Ruleset {

  constructor() {
    super(
      Ruleset.FAAN_LAAK,
      500,         // start score
      [5, 7, 10],  // tiered limits
      0,           // points for winning
      0.5,         // no-point hand score
      false,       // losers do not pay each other
      false,       // east does not doubles up
      true,        // selfdraw wins pay double
      true,        // discarding player pays double
      true,        // reverse wind direction
      true         // deal passes when east wins
    );
  }

  /**
   * What are considered point-scoring pungs in this ruleset?
   */
  getPungValue(tile, locked, concealed, names, windTile, windOfTheRoundTile) {
    let prefix = (locked && !concealed) ? "" : "concealed ";

    if (tile > 26) {
      if (tile > 30) {
        return { score: 1, log: [`1 faan for ${prefix}pung of dragons (${names[tile]})`] };
      }

      let scoreObject = { score: 0, log: [] };
      if (tile === windTile) {
        scoreObject.score += 1;
        scoreObject.log.push(`1 faan for ${prefix}pung of player's own wind (${names[tile]})`);
      }
      if (tile === windOfTheRoundTile) {
        scoreObject.score += 1;
        scoreObject.log.push(`1 faan for ${prefix}pung of wind of the round (${names[tile]})`);
      }
      return scoreObject;
    }
  }

  /**
   * What are considered point-scoring kongs in this ruleset?
   */
  getKongValue(tile, locked, concealed, names, windTile, windOfTheRoundTile) {
    let prefix = (locked && !concealed) ? "" : "concealed ";

    if (tile > 26) {
      if (tile > 30) {
        return { score: 1, log: [`1 faan for ${prefix}kong of dragons (${names[tile]})`] };
      }

      let scoreObject = { score: 0, log: [] };
      if (tile === windTile) {
        scoreObject.score += 1;
        scoreObject.log.push(`1 faan for ${prefix}kong of player's own wind (${names[tile]})`);
      }
      if (tile === windOfTheRoundTile) {
        scoreObject.score += 1;
        scoreObject.log.push(`1 faan for ${prefix}kong of wind of the round (${names[tile]})`);
      }
      return scoreObject;
    }
  }

  /**
   * There are special points that any player can get
   * at the end of the hand. Calculate those here:
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
      scoreObject.score += 4;
      scoreObject.log.push(`4 faan for little three dragons`);
    }
  }

  /**
   * There are special points that you can only get
   * by winning the hand. Calculate those here:
   */
  checkWinnerHandPatterns(scorePattern, winset, selfdraw, selftile, robbed, windTile, windOfTheRoundTile, tilesLeft, scoreObject) {
    let names = config.TILE_NAMES;
    let suits = config.SUIT_NAMES;

    let state = this.getState(scorePattern, winset, selfdraw, selftile, robbed, windTile, windOfTheRoundTile, tilesLeft);

    if (state.selfdraw) {
      scoreObject.score += 1;
      scoreObject.log.push(`1 faan for self-drawn win (${names[selftile]})`);
    }

    if (state.robbed) {
      scoreObject.score += 1;
      scoreObject.log.push(`1 faan for robbing a kong (${names[winset[0]]})`);
    }

    if (state.chowhand && !state.majorPair) {
      scoreObject.score += 1;
      scoreObject.log.push(`1 faan for chow hand`);
    }

    if (state.onesuit) {
      if (state.honours) {
        scoreObject.score += 1;
        scoreObject.log.push(`1 faan for one suit (${suits[state.suit]}) and honours hand`);
      } else {
        scoreObject.score += 5;
        scoreObject.log.push(`5 faan for clean one suit hand (${suits[state.suit]})`);
      }
    }

    if (state.allterminals) {
      scoreObject.limit = `all terminals hand`;
    }

    if (state.allhonours) {
      scoreObject.limit = `all honours hand`;
    }

    if (state.punghand) {
      scoreObject.score += 3;
      scoreObject.log.push(`3 faan for all pung hand`);
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
      scoreObject.score += 1;
      scoreObject.log.push(`1 faan for fully concealed hand`);
    }

    // no point hand?
    if (scoreObject.score === 0) {
      scoreObject.log.push(`${this.no_point_score} for no-point hand`);
    }
  }

  /**
   * Award points based on bonus tiles.
   */
  checkBonusTilePoints(bonus, windTile, names, result) {
    let hasOwnFlower = false;
    let hasOwnSeason = false;

    bonus.forEach(tile => {
      if (this.ownFlower(tile, windTile)) hasOwnFlower = true;
      if (this.ownSeason(tile, windTile)) hasOwnSeason = true;
    });

    if (bonus.length === 0) {
      result.score += 1;
      result.log.push(`1 faan for no flowers or seasons`);
    }

    if (hasOwnFlower) {
      result.score += 1;
      result.log.push(`1 faan for own flower and season`);
    }

    if (hasOwnSeason)  {
      result.score += 1;
      result.log.push(`1 faan for own flower and season`);
    }

    if (this.allFlowers(bonus)) {
      result.score += 1;
      result.log.push(`1 faan for having all flowers`);
    }

    if (this.allSeasons(bonus)) {
      result.score += 1;
      result.log.push(`1 faan for having all seasons`);
    }
  }
}

// register as a ruleset
Ruleset.register(Cantonese);

export { Cantonese };
