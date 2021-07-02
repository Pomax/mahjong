import { config } from "../../../../config.js";
import { WallHack } from "./wall-hack.js";

let base = [...new Array(34)].map((_, i) => i);
const BASE = base
  .concat(base)
  .concat(base)
  .concat(base)
  .concat([34, 35, 36, 37, 38, 39, 40, 41]);

/**
 * This basically represents a shuffled a pile of tiles
 * for dealing from during a hand of play.
 */
class Wall {
  constructor(players) {
    this.players = players;
    this.reset();
  }

  // shuffle utility function, also used by WallHack
  getBase() {
    return BASE.slice();
  }

  // shuffle utility function, also used by WallHack
  shuffle(list) {
    list = list.slice();
    let shuffled = [];
    while (list.length) {
      let pos = (config.PRNG.nextFloat() * list.length) | 0;
      shuffled.push(list.splice(pos, 1)[0]);
    }
    return shuffled;
  }

  /**
   * Reset the wall to a full set of tiles, then shuffle them.
   */
  reset() {
    this.tiles = this.shuffle(this.getBase());
    this.deadSize = 16;
    this.dead = false;
    this.remaining = this.tiles.length - this.dead;

    // if there's a wall hack active, throw away what
    // we just did and use the hacked wall instead.
    if (config.WALL_HACK) {
      WallHack.set(this, WallHack.hacks[config.WALL_HACK]);
    }
  }

  /**
   * Get one or more tiles from this pile of tiles.
   */
  get(howMany = 1) {
    let left = this.tiles.length - howMany;
    this.remaining = left - this.deadSize;
    this.players.forEach((p) => p.markTilesLeft(this.remaining));
    this.dead = this.tiles.length - howMany <= this.deadSize;
    if (howMany === 1) return this.tiles.shift();
    return this.tiles.splice(0, howMany);
  }
}

export { Wall };
