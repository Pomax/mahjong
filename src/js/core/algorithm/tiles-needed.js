import { Pattern } from "./pattern.js";
import { PatternSet } from "./pattern-set.js";
import { unroll } from "../utils/utils.js";
import { TileSet } from "./tileset.js";
import { Constants } from "../../../config.js";


/**
 * This function uses the Pattern class to determine which tiles
 * a player might be interested in, to form valid hands. And,
 * if they already have a winning hand, how many interpretations
 * of the tiles involved there might be.
 */
function tilesNeeded(tiles, locked=[]) {
  // console.debug('tilesNeeded:', tiles, locked);
  let p = new Pattern(tiles);

  // Transform the "locked tiles" listing to
  // a form that the rest of the code understands.
  locked = convertToPatternSets(locked);

  // Extract the pair, if there is one.
  let pair = [];
  locked.some((set,pos) => {
    if (set.type === 'pair') {
      pair.push(set);
      return locked.splice(pos,1);
    }
  });

  // Then run a pattern expansion!
  let {results, paths} = p.expand(pair.map(s => s.tilenumber), locked); // TODO: this should not need mapping

  // Is this a winning hand?
  let winpaths = (results.win || []).map(result => {
    let p = pair[0];
    let rpair = new PatternSet('pair', result.pair[0]);
    return [ (p && p.equals(rpair)) ? p : rpair, ...result.sets ];
  });
  let winner = (winpaths.length > 0);

  // Is this a waiting hand?
  delete results.win;
  let lookout = results;
  let waiting = !winner && lookout.some(list => list.some(type => type.indexOf('32')===0));

  // What are the various "compositions" in this hand?
  paths = paths.map(path => unroll(path));
  let composed = getUniqueCompositions(paths, );
  let to_complete = getStillNeeded(locked, composed);

  // And that's all the work we need to do.
  return { lookout, waiting, composed, to_complete, winner, winpaths};
};


/**
 * A helper function for converting HTML tile arrays into PatternSet objects.
 */
function convertToPatternSets(locked) {
  return locked.map(set => {
    let numbered = set.map(t => t.getTileFace ? t.getTileFace() : t).sort();
    return PatternSet.fromTiles(numbered, true, set.concealed);
  }).filter(v => v);
}


/**
 * Convert the list of all possible pathing combinations
 * into a concise list of unique compositional paths.
 */
function getUniqueCompositions(paths) {
  // (1) Remove full duplicates
  let composed = [];

  paths.forEach(path => path.forEach(part => {
    if (composed.some(e => e===part)) return;
    composed.push(part);
  }));

  composed.sort((a,b) => a.length - b.length);

  // And then (2) reduce the 'graph' because something like
  // this...
  //
  //   0: Array [ "2p-2", "2p-17" ]
  //   1: Array(3) [ "2p-2", "3c-5", "2p-17" ]
  //   2: Array [ "2p-17" ]
  //   3: Array [ "3c-5", "2p-17"]
  //
  // ... is really just a single chain (1) because all the
  // others are contained by that chain.
  //
  // The real solution to this whole filter/reduce business
  // is a change to Pattern, of course, so that it generates
  // only the maximum path, with splits only when needed.

  let filtered = [];

  for(let i=0, e=composed.length; i<e; i++) {
    let allFound = false;
    let list = composed[i];

    for (let j=i+1; j<e; j++) {
      let other = composed[j];
      allFound = list.every(part => other.find(e => e.equals(part)));
      if (allFound) break;
    }

    if (!allFound) filtered.push(list);
  }

  return filtered;
}


/**
 * Determine how many pairs/sets a compositional
 * path still needs to be a winning composition.
 */
function getStillNeeded(locked, composed) {
  let pcount = 1, scount = 4;

  if (locked.length > 0) {
    locked.forEach(set => {
      if (set.size()===2) pcount--;
      else scount--;
    });
  }

  let to_complete = [];

  composed.forEach( (composition, pos) => {
    let p = pcount, s = scount, list = [];

    composition.forEach(set => {
      if (set.size()===2) p--;
      else s--;
    });

    if (p>0) list.push(Constants.PAIR);
    while (s-- > 0) list.push(Constants.SET);
    to_complete[pos] = list;
  });

  return to_complete;
}

export { tilesNeeded };
