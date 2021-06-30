import { TileTracker } from "./tracking/tile-tracker.js";
import { tilesNeeded } from "./../algorithm/tiles-needed.js";
import { create } from "../utils/utils.js";


// =========================================
//        Let's define a Player class!
// =========================================

class PlayerMaster {
  constructor(id) {
    this.el = document.createElement('div');
    this.el.setAttribute('class', 'player');
    this.el.id = id;
    this.id = id;
    this.tracker = new TileTracker(this.id);
    this.ui = false;
    this.wincount = 0;
    this.reset();
  }

  reset(wind, windOfTheRound, hand, draws) {
    this.wind = wind;
    this.windOfTheRound = windOfTheRound;
    this.draws = draws;
    this.discards = []; // tracks this player's discards over the course of a hand
    this.tiles = [];
    this.locked = [];
    this.bonus = [];
    this.waiting = false; // waiting to win?
    this.has_won = false; // totally has won!
    this.selfdraw = false;
    this.robbed = false; // won by robbing a kong?
    this.tracker.reset();
    this.el.innerHTML = '';
    this.el.classList.add('winner');
    if (this.ui) this.ui.reset(wind, windOfTheRound, hand, draws);
  }

  /**
   * Pause play as far as this player is concerned.
   */
  pause(lock) {
    this.paused = lock;
    if (this.ui) this.ui.pause(lock);
  }

  /**
   * Resume play as far as this player is concerned.
   */
  resume() {
    if (this.ui) this.ui.resume();
    this.paused = false;
  }

  /**
   * Signal that the game will start
   */
  gameWillStart(game, rules) {
    if (this.ui) this.ui.gameWillStart();
    this.setActiveGame(game);
    this.setRules(rules);
  }

  /**
   * Set the game this player is now playing in.
   */
  setActiveGame(game) {
    this.game = game;
  }

  /**
   * Bind the ruleset that this player should "follow"
   * during the game they are currently in.
   */
  setRules(rules) {
    this.rules = rules;
    this._score = this.rules.player_start_score;
    if (this.ui) this.ui.setRules(rules);
  }

  /**
   * Signal that a specific hand will start
   */
  handWillStart(redraw, resolve) {
    if (this.ui) this.ui.handWillStart(redraw, resolve);
    else resolve();
  }

  /**
   * Signal that actual play is about to start
   * during a hand. This is called after all the
   * initial tiles have been dealt, and all players
   * have declared any kongs they might have had
   * in their hand as a consequence.
   */
  playWillStart() {
    if (this.ui) this.ui.playWillStart();
  }

  /**
   * Take note of how many tiles there are left
   * for playing with during this hand.
   */
  markTilesLeft(left, dead) {
    this.tilesLeft = left;
    this.tilesDead = dead;
    if (this.ui) this.ui.markTilesLeft(left, dead);
  }

  /**
   * Disclose this player's hand information.
   */
  getDisclosure() {
    return {
      // tile information
      concealed: this.getTileFaces().filter(v => v < 34),
      locked: this.locked,
      bonus: this.bonus,
      // play information,
      discards: this.discards.map(t => t?t.getTileFace():t),
      // player information
      wind: this.wind,
      winner: this.has_won,
      wincount: this.getWinCount(),
      // If this player has won, did they self-draw their winning tile?
      selfdraw: this.has_won ? this.selfdraw : false,
      selftile: (this.has_won && this.selfdraw) ? this.latest : false,
      robbed: this.robbed,
      // If this player has won, the last-claimed tile can matter.
      final: this.has_won ? this.latest.getTileFace() : false
    };
  }

  /**
   * Signal that the hand has ended. If the hand
   * was a draw, there will no arguments passed.
   * If the hand was won, the `fullDisclosures`
   * object contains all player's disclosures.
   */
  endOfHand(fullDisclosure) {
    if (this.ui) this.ui.endOfHand(fullDisclosure);
  }

  /**
   * Signal that the game has ended, with the final
   * game scores provided in the `scores` object.
   */
  endOfGame(scores) {
    if (this.ui) this.ui.endOfGame(scores);
  }

  /**
   * Work a score adjustment into this player's
   * current score.
   */
  recordScores(adjustments) {
    this._score += adjustments[this.id];
    if (this.ui) this.ui.recordScores(adjustments);
  }

  /**
   * Get this player's current game score.
   */
  getScore() {
    return this._score;
  }

  /**
   * Signal that this is now the active player.
   */
  activate(id) {
    if (this.ui) this.ui.activate(id);
  }

  /**
   * Signal that this is not an active player.
   */
  disable() {
    if (this.ui) this.ui.disable();
  }

  /**
   * Internal function for marking self as waiting
   * to win, using any tile noted in `winTiles`.
   */
  markWaiting(winTiles={}) {
    this.waiting = winTiles;
    if (this.ui) this.ui.markWaiting(winTiles)
  }

  /**
   * Mark this player as winner of the current hand.
   */
  markWinner() {
    if (!this.has_won) {
      this.has_won = true;
      this.wincount++;
      if (this.ui) this.ui.markWinner(this.wincount);
    }
  }

  /**
   * How many times has this player won?
   */
  getWinCount() {
    return this.wincount;
  }

  /**
   * Add a tile to this player's hand.
   */
  append(tile, claimed, supplement) {
    let face;
    let revealed = false;

    if (typeof tile !== 'object') {
      face = tile;
      tile = create(tile);
    } else {
      face = tile.getTileFace();
    }

    this.latest = tile;

    if (tile.isBonus()) {
      revealed = face
      this.bonus.push(face);
    } else {
      this.tiles.push(tile);
    }

    if (!claimed) {
      this.tracker.seen(tile.getTileFace());
      this.lastClaim = false;
    }

    if (supplement) tile.supplement();
    if (this.ui) this.ui.append(tile);
    return revealed;
  }

  /**
   * Remove a tile from this player's hand
   * (due to a discard, or locking tiles, etc).
   */
  remove(tile) {
    let pos = this.tiles.indexOf(tile);
    this.tiles.splice(pos, 1);
    if (this.ui) this.ui.remove(tile);
  }

  /**
   * Can we chow off of the indicated player?
   */
  mayChow(pid) {
    return ((pid+1)%4 == this.id);
  }

  /**
   * Player formed a kong by having a pung on
   * the table, and drawing the fourth tile
   * themselves.
   */
  meldKong(tile) {
    this.remove(tile);
    let set = this.locked.find(set => (set[0].getTileFace() === tile.getTileFace()));
    let meld = set[0].cloneNode(true);
    meld.meld();
    set.push(meld);
    if (this.ui) this.ui.meldKong(tile);
  }

  /**
   * Check whether this player has, and if so,
   * wants to declare, a kong. Implement by bot.
   */
  async checkKong() {
    return false;
  }

  /**
   * Take note of the fact that a player revealed
   * one or more tiles, either due to discarding,
   * revealing a bonus tile, or by claiming/melding
   * a set.
   */
  see(tiles, player) {
    if (player === this) return;
    if (!tiles.map) tiles = [tiles];
    tiles.forEach(tile => this.tracker.seen(tile));
    if (this.ui) this.ui.see(tiles, player);
  }

  /**
   * Take note of the fact that a different player
   * received a tile for whatever reason.
   */
  receivedTile(player) {
    if (this.ui) this.ui.receivedTile(player);
  }

  /**
   * Get the play information in terms of what this player
   * might be looking for, whether they're ready to win,
   * etc. based on Pattern expansion.
   */
  tilesNeeded() {
    return tilesNeeded(this.getTileFaces(), this.locked);
  }

  /**
   * Take note of the fact that a different player
   * discarded a specific tile.
   */
  playerDiscarded(player, discard, playcounter) {
    let tile = discard.getTileFace();
    if (this.id != player.id) this.tracker.seen(tile);
    if (this.ui) this.ui.playerDiscarded(player, tile, playcounter);
  }

  /**
   * Take note of the fact that a different player
   * declared a kong.
   */
  async seeKong(tiles, player, tilesRemaining, resolve) {
    this.see(tiles.map(t => t.getTileFace()), player);
    this.robKong(player.id, tiles, tilesRemaining, resolve);
  }

  /**
   * Implemented by subclasses: this function tries
   * to rob a kong. If it can't, call `resolve()`,
   * but if it can, form a `claim` and then call
   * `resolve(claim)` with the appropriate wintype
   * set, as well as `from`, `tile`, and `by`:
   *
   * `from`: the player id of the person we're robbing.
   * `tile`: the tile number we're robbing.
   * `by`: our player id.
   *
   */
  async robKong(pid, tiles, tilesRemaining, resolve) {
    resolve();
  }

  /**
   * Give up a kong tile, if someone robbed it to win.
   */
  giveUpKongTile(tile) {
    let set = this.locked.find(set => set.length===4 && set[0].getTileFace() === tile);
    let discard = set.splice(0,1)[0];
    discard.unconceal();
    return discard;
  }

  /**
   * Take note of a player having to give up a kong
   * because someone just robbed it to win.
   */
  playerGaveUpKongTile(pid, tilenumber) {
    if (this.ui) this.ui.playerGaveUpKongTile(pid, tilenumber);
  }

  /**
   * Take note of the fact that a different player
   * claimed a discard to form a set.
   */
  seeClaim(tiles, player, claimedTile, claim) {
    if (player === this) return;
    if (!tiles.map) tiles = [tiles];

    tiles.forEach((tile, pos) => {
      // We've already seen the discard that got claimed
      if (tile === claimedTile) return;
      // But we haven't seen the other tiles yet.
      this.tracker.seen(tile.getTileFace());
    });
    if (this.ui) this.ui.seeClaim(tiles, player, claim);
  }

  /**
   * Signal that the current player is done.
   */
  nextPlayer() {
    if (this.ui) this.ui.nextPlayer();
  }

  getAvailableTiles() {
    return this.tiles;
  }

  getSingleTileFromHand(tile) {
    return this.tiles.find(t => (t.getTileFace() == tile));
  }

  getAllTilesInHand(tile) {
    return this.tiles.filter(t => (t.getTileFace() == tile));
  }

  getTiles(allTiles) {
    return allTiles ? [...this.tiles, ...this.bonus] : this.tiles;
  }

  getTileFaces(allTiles) {
    return this.getTiles(allTiles).map(t => (t.getTileFace ? t.getTileFace() : t)).sort((a,b)=>(a-b));
  }

  getLockedTileFaces() {
    return this.locked.map(set => `[${set.map(v=>v.getTileFace()).sort((a,b)=>(a-b))}]${set.winning?'!':''}`);
  }

  sortTiles() {
    if (this.ui) this.ui.sortTiles();
  }

  /**
   * Check whether a chow can be formed using `tile` from
   * player with id `pid`, by looking at our hand tiles.
   */
  async chowExists(pid, tile)  {
    // If this isn't a numerical tile, no chow can be formed.
    if (tile > 26)  return CLAIM.IGNORE;

    // nor if the discard did not come from the previous player.
    let next = (pid + 1) % 4;
    let valid = next == this.id;
    if (!valid) return CLAIM.IGNORE;

    // We're still here: can we form a chow with this discard?
    let tiles = this.getTileFaces();
    let face = tile % 9;
    let tm2 = (face > 1) ? tiles.indexOf(tile - 2) >= 0 : false;
    let tm1 = (face > 0) ? tiles.indexOf(tile - 1) >= 0 : false;
    let t1  = (face < 8) ? tiles.indexOf(tile + 1) >= 0 : false;
    let t2  = (face < 7) ? tiles.indexOf(tile + 2) >= 0 : false;
    let c1 = t1 && t2;
    let c2 = tm1 && t1;
    let c3 = tm2 && tm1;

    if (c1) return CLAIM.CHOW1;
    if (c3) return CLAIM.CHOW3;
    if (c2) return CLAIM.CHOW2;
    return CLAIM.IGNORE;
  }
}

export { PlayerMaster };
