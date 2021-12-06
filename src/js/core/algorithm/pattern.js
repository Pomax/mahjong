import { unhash, hash } from "./hash-printing.js";
import { Constants } from "../../../config.js";
import { PatternSet } from "./pattern-set.js";


/**
 * An analysis class for working with collections
 * of "free" tiles in terms of what can be formed
 * with them, and which tiles would be needed to
 * turn incomplete sets into sets.
 */
class Pattern {
  constructor(tiles=[]) {
    this.keys = [];
    this.tiles = {};
    tiles.slice().sort((a,b)=>a-b).forEach(v => {
      if (this.tiles[v] === undefined) {
        this.tiles[v] = 0;
      }
      this.tiles[v]++;
      this.keys.push(v);
    });
  }

  /**
   * a factory version of a copy constructor
   */
  copy() {
    let p = new Pattern([], this.canChow);
    p.keys = this.keys.slice();
    p.keys.forEach(k => (p.tiles[k] = this.tiles[k]));
    return p;
  }

  /**
   * Remove a set of tiles from this pattern. If this
   * causes the number of tiles for a specific tile
   * face to reach 0, remove that tile from the tile set.
   */
  remove(tiles) {
    if (!tiles.forEach) tiles = [tiles];
    tiles.forEach(t => {
      this.tiles[t]--;
      if (this.tiles[t] === 0) {
        delete this.tiles[t];
        this.keys = Object.keys(this.tiles).sort((a,b)=>a-b);
      }
    });
  }

  /**
   * utility function to get the suit for an (assumed suited) tile.
   */
  getSuit(tile) { return ((tile/9)|0); }

  /**
   * utility function for confirming a specific tile is of a specific suit.
   */
  matchSuit(tile, suit) { return this.getSuit(tile) === suit; }

  /**
   * This lets us know whether or not there are a entries for [tile+1]
   * and [tile+2] in this hand, which lets us make decisions around whether
   * chows are a valid play strategy or not.
   */
  getChowInformation(tile) {
    let suit = (tile / 9)|0;
    let t1 = this.tiles[tile + 1];
    if (t1 !== undefined && !this.matchSuit(tile + 1, suit)) t1 = undefined;
    let t2 = this.tiles[tile + 2];
    if (t2 !== undefined && !this.matchSuit(tile + 2, suit)) t2 = undefined;
    let t3 = this.tiles[tile + 3];
    if (t3 !== undefined && !this.matchSuit(tile + 3, suit)) t3 = undefined;
    return { t1, t2, t3, suit };
  }

  /**
   * mark tile as needed to form a set
   */
  markNeeded(results, tile, claimtype, subtype=undefined) {
    if (!results[tile]) results[tile] = [];
    let print = hash({type: claimtype, tile, subtype});
    if (results[tile].indexOf(print) === -1) results[tile].push(print);
  }

  /**
   * add a set's hashprint to the list of winpath results
   */
  markWin(results, tile, subtype) {
    this.markNeeded(results, tile, Constants.WIN, subtype);
  }

  /**
   * The recursion function for `expand`, this function checks whether
   * a given count combination of singles, pairs, and sets constitutes a
   * winning combination (e.g. 4 sets and a pair is a winning path, but
   * seven singles and two pairs definitely isn't!)
   */
  recurse(seen, chain, to_remove, results, singles, pairs, sets) {
    let downstream = this.copy();
    downstream.remove(to_remove);

    // Do we have tiles left that need analysis?
    if (downstream.keys.length > 0) {
      return downstream.runExpand(seen, chain, results, singles, pairs, sets);
    }

    // We do not. What's the conclusion for this chain?

    // four sets and a pair is totally a winning path.
    if (sets.length===4 && pairs.length===1 && singles.length===0) {
      if (!results.win) results.win = [];
      results.win.push({
        pair: pairs,
        sets
      });
    }

    // four sets and a single is one tile away from winning.
    else if (sets.length===4 && pairs.length===0 && singles.length===1) {
      this.markWin(results, singles[0], Constants.PAIR);
    }

    // three sets and two pairs are one tile away from winning.
    else if (sets.length===3 && pairs.length===2) {
      this.markWin(results, pairs[0], Constants.PUNG);
      this.markWin(results, pairs[1], Constants.PUNG);
    }

    // three sets, a pair, and two singles MIGHT be one tile away from winning.
    else if (sets.length===3 && pairs.length===1 && singles.length===2) {
      if (singles[1] < 27 && singles[0] + 1 === singles[1]) {
        let t1 = singles[0]-1, s1 = this.getSuit(t1),
            b0 = singles[0],   s2 = this.getSuit(b0),
            b1 = singles[1],   s3 = this.getSuit(b1),
            t2 = singles[1]+1, s4 = this.getSuit(t2);
        if(s1 === s2 && s1 === s3) this.markWin(results, t1, Constants.CHOW1);
        if(s4 === s2 && s4 === s3) this.markWin(results, t2, Constants.CHOW3);
      }
      else if (singles[1] < 27 && singles[1] === singles[0]+2) {
        let middle = singles[0] + 1;
        let s1 = this.getSuit(singles[0]);
        let s2 = this.getSuit(middle);
        let s3 = this.getSuit(singles[1]);
        if (s1===s3 && s1===s2) this.markWin(results, middle, Constants.CHOW2);
      }
    }

    // Everything else isn't really all that worth evaluating.

    // TODO: OR IS IT??
  }

  /**
   * Determine which set compositions are possible with the current
   * list of tiles. Specifically, which count combination of singles,
   * pairs, and sets can we make with these tiles?
   */
  runExpand(seen=[], paths=[], results=[], singles=[], pairs=[], sets=[]) {
    //console.log(`called with:`, seen, '- aggregated', pair, set, `- local tiles:`, this.tiles);

    if (!this.keys.length) {
      // It's possible the very first call is already for a complete,
      // and entirely locked, hand. In that case, return early:
      if (sets.length===4 && pairs.length===1 && singles.length===0) {
        if (!results.win) results.win = [];
        results.win.push({
          pair: pairs,
          sets
        });
      }
      return { results, paths };
    }

    // Otherwise, let's get determine-y:

    seen = seen.slice();
    let tile = (this.keys[0]|0); // remember: object keys are strings, we need to (int) them,
    seen.push(tile);

    let count = this.tiles[tile];
    let head = [];
    let toRemove = [];

    //console.debug(`evaluating tile`,tile);

    // If we're holding a kong, recurse with the set count increased by one,
    // which we do by adding this kong's hash print to the list of known sets.
    if (count>3) {
      head=[new PatternSet(`kong`, tile)];
      paths.push(head);
      toRemove = [tile, tile, tile, tile];
      this.recurse(seen, head, toRemove, results, singles, pairs, sets.concat(head));
    }

    // If we're (implied or only) holding a pung, also recurse with the set count increased by one.
    if (count>2) {
      head=[new PatternSet(`pung`, tile)];
      paths.push(head);
      toRemove = [tile, tile, tile];
      this.markNeeded(results, tile, Constants.KONG);
      this.recurse(seen, head, toRemove, results, singles, pairs, sets.concat(head));
    }

    // If we're (implied or only) holding a pair, also recurse with the pair count increased by one.
    if (count>1) {
      head=[new PatternSet(`pair`, tile)];
      paths.push(head);
      toRemove = [tile, tile];
      this.markNeeded(results, tile, Constants.PUNG);
      this.recurse(seen, head, toRemove, results, singles, pairs.concat([tile]), sets); // FIXME: why is this not concat(head)-able?
    }

    // And of course, the final recursion is for treating the tile as "just a singles".
    this.recurse(seen, paths, [tile], results, singles.concat([tile]), pairs, sets);

    // Now, if we're dealing with honour tiles, this is all we need to do.
    if (tile > 26) return { results, paths };

    // but if we're dealing with a suited number tile, we also need to check for chows.
    let {t1, t2, t3} = this.getChowInformation(tile);

    if (t1 || t2) {
      let suit = this.getSuit(tile);
      if (t1 && t2) {
        // we are holding a chow!
        head=[new PatternSet(`chow`, tile)];
        paths.push(head);
        toRemove = [tile, tile+1, tile+2];
        if (t3) {
          // Make sure that in {5,6,7,8}, the code knows that
          // 6 and 7 are both potentially useful tiles.
          this.markNeeded(results, tile+1, Constants.CHOW1);
          this.markNeeded(results, tile+2, Constants.CHOW3);
        }
        if (seen.indexOf(tile-1) === -1) {
          // We might also be one tile away from having a chow(1), if -1 is in the same suit.
          if (this.matchSuit(tile-1,suit)) this.markNeeded(results, tile-1, Constants.CHOW1);
        }
        this.recurse(seen, head, toRemove, results, singles, pairs, sets.concat(head));
      }
      else if (t1) {
        // We might be one tile away from having a chow(3), if +2 is in the same suit.
        if (this.matchSuit(tile+2,suit)) this.markNeeded(results, tile+2, Constants.CHOW3);
        // We might also be one tile away from having a chow(1), if -1 is in the same suit.
        if (seen.indexOf(tile-1) === -1) {
          // We might also be one tile away from having a chow(1), if -1 is in the same suit.
          if (this.matchSuit(tile-1,suit)) this.markNeeded(results, tile-1, Constants.CHOW1);
        }
        this.recurse(seen, paths, [tile, tile+1], results, singles, pairs, sets);
      }
      else {
        // One tile away from having a chow, and because it's the
        // middle tile, we know that it's the correct suit already.
        this.markNeeded(results, tile+1, Constants.CHOW2);
        this.recurse(seen, paths, [tile, tile+2], results, singles, pairs, sets);
      }
    }

    return { results, paths };
  }

  // Convenience function, so calling code doesn't need to know about
  // empty array instantiations for path/results/single
  expand(pair=[], set=[]) {
    return this.copy().runExpand(
      [], // seen
      [], // paths
      [], // results
      [], // singles
      pair,
      set
    );
  }
}

export { Pattern };
