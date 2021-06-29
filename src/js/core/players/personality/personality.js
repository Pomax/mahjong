import { config, CLAIM } from "../../../../config.js";
import { buildStatsContainer } from "./stats.js";
import { max } from "../../utils/math.js";


/**
 * This is a class that regulates, given a tile that a bot might
 * have the opportunity to claim, whether or not to claim it.
 */
class Personality {
  constructor(player) {
    this.player = player;

    // This determines whether or not we consider
    // scoring an otherwise chicken hand, as long
    // as it has something that scores points, like
    // a pung of dragons, or own/wotr winds.
    this.allowScoringChicken = true;

    // How many of our tiles need to be of one suit
    // before we decide to go for a clean hand?
    this.cleanThreshold_low = 0.6;
    this.cleanThreshold_high = 0.7;
    this.playClean = false;

    // Should we lock into a chow hand?
    this.playChowHand = false

    // probability of chickening at any check.
    this.chickenThreshold = config.BOT_CHICKEN_THRESHOLD;
    this.chicken = false;

    // For our panic threshold, we pick "4 turns"
    // (out of a possible 18 "turns" in a hand).
    this.basePanicThreshold = 16;
    this.panicThreshold = this.basePanicThreshold;
  }

  /**
   * Check whether we should just start chickening.
   */
  checkChicken(tilesRemaining) {
    // already going for chickens?
    if (this.chicken) return;

    // panic mode?
    if (this.chickenThreshold < 1 && tilesRemaining < this.panicThreshold) {
      this.chickenThreshold += this.chickenThreshold;
    }

    if (config.PRNG.nextFloat() < this.chickenThreshold) {
      this.chicken = true;
      let notice = `player ${this.player.id} will be going for chicken hands at ${tilesRemaining} tiles left!`;
      console.log(notice);
      config.log(notice);
    }
  }

  // utility function
  suit(t) { return (t/9)|0; }

  /**
   * Decide how panicky we are, based on the number
   * of draws we've seen for this hand so far.
   */
  setDraws(draws=0) {
    this.panicThreshold = this.basePanicThreshold + draws * this.basePanicThreshold;
    console.debug(`panic for ${this.player.id} set to ${this.panicThreshold}`);
  }

  /**
   * Analyze the start tiles in a hand, to see what a
   * reasonable policy is going to be for these tiles.
   */
  determinePersonality() {
    // reset our chicken probability
    this.chickenThreshold = config.BOT_CHICKEN_THRESHOLD;
    this.chicken = false;

    // then check what we should do.
    this.analyse();
  }

  /**
   * Decide what an acceptable play policy is.
   */
  analyse() {
    let player = this.player;
    let stats = buildStatsContainer(player);

    // should we play clean?
    let most = max(...stats.suits);
    let total = stats.numerals;
    if (this.playClean === false && !this.stopClean && most/total > this.cleanThreshold_high) {
      this.playClean = stats.suits.indexOf(most);
      console.debug(`${player.id} will play clean (${this.playClean})`);
    }

    // if we're already playing clean, should we _stop_ playing clean?
    if (this.playClean !== false) {
      if (player.locked.length > 0) {
        let mismatch = player.locked.some(set => set[0].getTileFace() !== this.playClean);
        if (mismatch) { this.playClean = false; }
      }
      if (most/total < this.cleanThreshold_low) { this.playClean = false; }
      if (this.playClean === false) {
        this.stopClean = true;
        console.debug(`${player.id} will stop trying to play clean.`);
      }
    }

    // if we haven't locked anything yet, is this gearing up to be a chow hand?
    if (!player.locked.length) {
      let chowScore = stats.cpairs/2 + stats.chows;
      this.playChowHand = (stats.honours <=3 &&  chowScore >= 2 && stats.pungs < stats.chows);
      // note that this is a fluid check until we claim something, when it locks.
    }

    /**
     * THIS CODE HAS BEEN COMMENTED OFF BECAUSE IT IS SUPER SLOW.
     *
     * // Also have a look at possible score improvements
     * let scoring = this.player.rules.determineImprovement(this.player);
     *
     **/

    return stats;
  }

  /**
   * Do we want a particular tile?
   */
  want(tileNumber, reason, tilesRemaining) {
    this.checkChicken(tilesRemaining);

    // Are we the fowlest of chickens?
    if (this.chicken) {
      console.debug(this.player.id,'is going for chickens');
      return true;
    }

    // If we get here, we need to actually decide what our play policy for this tile is.
    let stats = this.analyse();
    if (false === this.checkClean(tileNumber, reason, tilesRemaining)) return false;
    if (!this.checkChow(tileNumber, reason, tilesRemaining, stats)) return false;
    if (!this.checkPung(tileNumber, reason, tilesRemaining, stats)) return false;

    // if we get here, nothing has ruled out this claim.
    return true;
  }

  /**
   * Would claiming this tile violate our clean policy? (if we don't have
   * one set, then obviously the answer is "no").
   */
  checkClean(tileNumber, reason, tilesRemaining, stats=false) {
    // Did we decide to play clean (i.e. any numbers in our hand must all be from the same suit)
    if (this.playClean!==false && tileNumber < 27) {
      let tilesuit = this.suit(tileNumber);
      if (tilesuit !== this.playClean) {
        console.debug(this.player.id, 'not claiming ',tileNumber,'due to playing clean','(',tilesRemaining,'left)');
        return false;
      }
    }

    // Secondary check: the tile itself is fine, but is the rest of our hand clean?
    if (stats) {
      console.debug(this.player.id, `checkClean with stats`. stats);

      let scount = stats.suits.reduce((t,v) => v>0 ? t+1 : t, 0);
      if (scount > 1) {
        console.debug(this.player.id, `trying to win clean, so we can't claim ${tileNumber} to win`);
        console.debug(this.player.id, this.playClean, tileNumber);
        // of course, only allow chows and better.
        if (reason >= CLAIM.CHOW) {
          console.debug(this.player.id, `claim ${reason}`);
          return reason;
        }
        console.debug(this.player.id, `no claim`);
        return false;
      }
    }

    return true;
  }

  /**
   * Can we declare a chow, given the play policy we've settled on at this point?
   */
  checkChow(tileNumber, reason, tilesRemaining, stats) {
    // Try not to chicken, part 1: don't go for chows if we're already playing pungs.
    if (CLAIM.CHOW <= reason && reason < CLAIM.PUNG) {
      let canChicken = this.allowScoringChicken && (stats.bigpungs > 0 || stats.locked.bigpungs > 0);

      if (stats.locked.pungs > 0 && !canChicken) {
        console.debug(this.player.id,'not claiming chow because we have a pung','(',tilesRemaining,'left)');
        return false;
      }
    }
    return true;
  }

  /**
   * Can we declare a pung/kong, given the play policy we've settled on at this point?
   */
  checkPung(tileNumber, reason, tilesRemaining, stats) {
    // Try not to chicken, part 2 don't go for pungs if we're going for a chow hand
    if (reason === CLAIM.PUNG || reason === CLAIM.KONG) {
      let canChicken =  this.allowScoringChicken && (stats.bigpungs > 0 || stats.locked.bigpungs > 0);
      let isBig = (tileNumber + 27 === this.player.wind) || (tileNumber + 27 === this.player.windOfTheRound) || (tileNumber > 30);

      if ((this.playChowHand || stats.locked.chows) > 0 && !canChicken && !isBig) {
        console.debug(this.player.id,'not claiming pung/kong because we have a chow, and',tileNumber,'is not scoring','(',tilesRemaining,'left)');
        return false;
      }
    }
    return true;
  }

  /**
   * Do we want to win on a particular tile?
   */
  determineWhetherToWin(tileNumber, reason, tilesRemaining) {
    this.checkChicken(tilesRemaining);

    // Are we still the fowlest of chickens?
    if (this.chicken) {
      console.debug(this.player.id,'is going for chickens');
      return true;
    }

    // If we get here, we need to actually decide what our play policy for this tile is.
    let stats = this.analyse();

    // Note that the "clean play" check is a little different compared to what
    // happens in the `want()` function: when we're deciding to win, we need
    // to check not just whether "this tile" is clean, but also whether the
    // rest of our hand is clean. If it's not, this might still be a good claim
    // to make (e.g. pung of dragons), so instead of saying "we don't want this"
    // we say "we don't want to WIN on this, but we want it, for the reason that
    // you were going to use to win".
    let cleancheck = this.checkClean(tileNumber, reason, tilesRemaining, stats);
    if (cleancheck !== true) return cleancheck;

    // the regular chow/pung checks are still the same though.
    if (!this.checkChow(tileNumber, reason, tilesRemaining, stats)) return false;
    if (!this.checkPung(tileNumber, reason, tilesRemaining, stats)) return false;

    // if we get here, nothing has ruled out this claim.
    return true;
  }

  /**
   * When this function is called, the player HAS a winning hand,
   * but it doesn't know whether it's valid in terms of play policy
   * yet (e.g. winning on a chow when going for a pung hand).
   */
  isValidWin(tilesRemaining) {
    this.checkChicken(tilesRemaining);

    // Are we continuing to be the fowlest of chickens?
    if (this.chicken) {
      console.debug(this.player.id,'is going for chickens');
      return true;
    }

    let stats = this.analyse();
    let canChicken =  this.allowScoringChicken && (stats.bigpungs > 0 || stats.locked.bigpungs > 0);

    // if we're playing clean, is our hand clean?
    let scount = stats.suits.reduce((t,v) => v>0 ? t+1 : t, 0);
    console.debug(this.player.id, this.playClean, scount, stats);
    if (this.playClean !== false && scount > 1) {
      if (!canChicken) return false;
    }

    // if that's not an issue, are we mixing chows and pungs?
    if (stats.pungs>0 && stats.chows>0) {
      if (!canChicken) return false;
    }

    // if we get here, nothing has ruled out this win.
    return true;
  }

  /**
   * Is this tile, that is in our hand, a dead tile in terms of play
   * policy? E.g. is it a dots tile while we're trying to play clean
   * on the characters suit instead?
   */
  deadTile(tile, tilesRemaining) {
    this.checkChicken(tilesRemaining);

    // all tiles are welcome in a chicken hand.
    if (this.chicken) return false;

    // is this in a suit we want to get rid of?
    if (this.playClean !== false && tile < 27) {
      let suit = this.suit(tile);
      if (this.playClean !== suit) {
        // return how many of this suit we're going to get rid of.
        return this.player.tiles.map(t => this.suit(t.getTileFace())).filter(s => s===suit).length;
      }
    }

    // is this tile part of a concealed pung,
    // while we're going for a chow hand?
    let stats = this.analyse();
    if (stats.locked.chows > 0 && stats.counts[tile] > 2) {
      return true;
    }

    return false;
  }
}

export { Personality };
