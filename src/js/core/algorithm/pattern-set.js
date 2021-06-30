/**
 * Refactor class to turn string sets into real sets.
 */
class PatternSet {
  static from(hash) {
    return new PatternSet(unhash(hash));
  }

  static fromTiles(tiles, locked, concealed) {
    if (typeof tiles[0] !== "number") tiles = tiles.map((t) => t.getTileFace());
    let type = "";
    let tile = tiles[0];
    if (tiles.length === 4) type = "kong";
    if (tiles.length === 3) {
      if (tiles[1] === tile) type = "pung";
      else type = "chow";
    }
    if (tiles.length === 2) type = "pair";
    if (tiles.length === 1) type = "single";
    return new PatternSet(type, tile, locked, concealed);
  };


  constructor(type, tilenumber, locked, concealed) {
    if (tilenumber === undefined) {
      this.content = type;
    } else {
      this.type = type;
      this.tilenumber = tilenumber;
      this.locked = locked;
      // Note that the following value is a number to distinguish between:
      // - concealed kong declaration
      // - concealed pung part of a normal kong declaration
      this.concealed = concealed;
    }
  }

  getSetID() {
    let t = this.type;
    let asLocked = this.locked && !this.concealed;
    if (t === `kong`) return `4k-${this.tilenumber}-${asLocked ? `!` : ``}`;
    if (t === `pung`) return `3p-${this.tilenumber}-${asLocked ? `!` : ``}`;
    if (t === `chow`) return `3c-${this.tilenumber}-${asLocked ? `!` : ``}`;
    if (t === `pair`) return `2p-${this.tilenumber}-${asLocked ? `!` : ``}`;
    if (t === `single`) return `1s-${this.tilenumber}`;
    return "0n";
  }

  tiles() {
    let t = this.type,
      n = this.tilenumber;
    if (t === "kong") return [n, n, n, n];
    if (t === "pung") return [n, n, n];
    if (t === "chow") return [n, n + 1, n + 2];
    if (t === "pair") return [n, n];
    if (t === "single") return [n];
    return [];
  }

  size() {
    let t = this.type;
    if (t === "kong") return 4;
    if (t === "pung") return 3;
    if (t === "chow") return 3;
    if (t === "pair") return 2;
    if (t === "single") return 1;
    return 0;
  }

  equals(other) {
    return this.type === other.type && this.tilenumber === other.tilenumber;
  }

  // String parity
  split(...args) {
    return this.toString().split(...args);
  }
  indexOf(...args) {
    return this.toString().indexOf(...args);
  }
  valueOf() {
    return this.content ? this.content.valueOf() : this.getSetID();
  }
  toString() {
    return this.content ? this.content.toString() : this.getSetID();
  }
}

export { PatternSet };
