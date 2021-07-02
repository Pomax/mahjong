/**
 * This is an administrative class that is used by Players
 * to track how many instances of each tile are, potentially,
 * still left in the game, based on incomplete information
 * received during the playing of a hand.
 */
class TileTracker {
  constructor(id) {
    this.id = id;
    this.tiles = [];
    this.ui = false;
    this.reset();
  }

  setUI(ui) {
    this.ui = ui;
  }

  /**
   * Reset all tiles to "there are four".
   */
  reset() {
    let tiles = (new Array(34)).fill(4);
    tiles.push(1,1,1,1,1,1,1,1);
    this.tiles = Object.assign({}, tiles);
    if (this.ui) this.ui.resetTracker(this.tiles);
  }

  /**
   * Fetch the count associated with a specific tile.
   */
  get(tileNumber) {
    return this.tiles[tileNumber];
  }

  /**
   * Mark a specific tile as having been revealed to this
   * player (but not necessarily to all players!)
   */
  seen(tileNumber) {
    if (tileNumber.dataset) {
      console.log(`Player ${this.id} tracker was passed an HTMLElement instead of a tile`);
      console.trace();
      throw new Error('why is the tracker being given an HTML element?');
    }
    this.tiles[tileNumber]--;
    if (this.ui) this.ui.reduceTracker(tileNumber);
  }
}

export { TileTracker };
