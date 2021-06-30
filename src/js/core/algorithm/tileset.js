/**
 * The refactoring, part 1: creating an array-like for
 * use in all code that currently uses arrays for tile sets.
 */
class TileSet {
  constructor(...tiles) {
    // do not enforce int vs. "span" right now.
    this._tiles = tiles.slice();

    // let's be an array!
    Object.defineProperty(this, "length", {
      get: () => this._tiles.length,
      set: () => {},
    });

    for (let i = 0; i < 100; i++) {
      Object.defineProperty(this, `${i}`, {
        get: () => this._tiles[i],
        set: (element) => (this._tiles[i] = element),
      });
    }
  }

  concat(other) {
    let joined = new TileSet();
    if (other instanceof Array) {
      joined._tiles = this._tiles.concat(other);
    }
    if (other instanceof TileSet) {
      joined._tiles = this._tiles.concat(other._tiles);
    }
    return joined;
  }

  every(fn) {
    return this._tiles.every(fn);
  }

  filter(fn) {
    let filtered = new TileSet();
    filtered._tiles = this._tiles.filter(fn);
    return filtered;
  }

  forEach(fn) {
    return this._tiles.forEach(fn);
  }

  map(fn) {
    let mapped = new TileSet();
    mapped._tiles = this._tiles.map(fn);
    return mapped;
  }

  push(element) {
    return this._tiles.push(element);
  }

  some(fn) {
    return this._tiles.some(fn);
  }

  sort(fn) {
    this._tiles.sort(fn);
    return this;
  }

  slice(...args) {
    let sliced = new TileSet();
    sliced._tiles = this._tiles.slice(...args);
    return sliced;
  }

  toString() {
    return this._tiles.toString();
  }

  valueOf() {
    return this._tiles.valueOf();
  }
}

export { TileSet };
