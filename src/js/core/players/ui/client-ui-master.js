import { config, CLAIM } from "../../../../config.js";
import { playClip } from "../../../page/audio.js";
import { create } from "../../utils/utils.js";
import { rotateWinds } from "./windicator.js";
import { modal } from "../../../page/modal/modal.js";
import { TaskTimer } from "../../../core/utils/task-timer.js";


/**
 * This is a graphical interface that players can use
 * to visualise their game knowledge, and allow external
 * interaction (human overrides for bots, or just plain
 * human input for... well, humans)
 */
class ClientUIMaster {
  constructor(player, tracker) {
    this.player = player;
    this.tracker = tracker;
    this.tracker.setUI(this);
    this.id = player.id;
    this.discards = document.querySelector(`.discards`);
    this.playerbanks = document.querySelectorAll(`.player`);
    this.knowledge = document.querySelector(`.knowledge`);
    this.settings = document.querySelector(`.settings`);
    this.theming = document.querySelector(`.theming`);

    this.gameBoard = document.querySelector(`.board`);
    if (config.PAUSE_ON_BLUR) {
      this.gameBoard.addEventListener(`blur`, async (evt) => {
        let resume = await this.player.game.pause();

        let handleResume = () => {
          this.gameBoard.removeEventListener(`focus`, handleResume);
          resume();
          this.pause_protection = true;
        };

        this.gameBoard.addEventListener(`focus`, handleResume);
      });
    }

    this.settings.addEventListener(`click`, () => modal.pickPlaySettings());
    this.theming.addEventListener(`click`, () => modal.pickTheming());

    this.el = this.playerbanks[this.id];
    this.reset(0,0);

    // Super debug setting: allows bots to tap directly
    // into the player`s UI. This is super bad, but for
    // development purposes, rather required.
    if (config.FORCE_OPEN_BOT_PLAY) {
      globalThis.PLAYER_BANKS = this.playerbanks;
      globalThis.PLAYER_BANKS.sortTiles = e => this.sortTiles(e);
    }
  }

  /**
   * ...docs go here...
   */
  reset(wind, windOfTheRound, hand, draws) {
    if(!this.el) return;

    this.el.setAttribute(`class`, `player`);
    this.playerbanks.forEach(b => {
      b.innerHTML = ``;
      b.setAttribute(`class`, `player`);
    });
    this.el.innerHTML = ``;

    let discards = this.discards;
    discards.innerHTML = ``;
    discards.setAttribute(`class`, `discards`);

    this.bar = document.createElement(`div`);
    this.bar.classList.add(`countdown-bar`);
    this.discards.appendChild(this.bar);

    if (this.countdownTimer) this.countdownTimer.cancel();
    this.countdownTimer = false;

    rotateWinds(this.rules, wind, windOfTheRound, hand, draws)
  }

  /**
   * Reset the player`s tile tracker panel
   */
  resetTracker(tiles) {
    if (!this.knowledge) return; // happens when initialised before the DOM

    this.knowledge.innerHTML = ``;

    Object.keys(tiles).forEach(tile => {
      let div = document.createElement(`div`);
      div.classList.add(`tile-count`);
      if (tile>33) div.classList.add(`hidden`);
      for(let i=0; i<4; i++) {
        let e = create(tile);
        div.appendChild(e);
      }
      this.knowledge.appendChild(div);
    });
  }

  /**
   * Remove a tile from the tile tracker panel.
   */
  reduceTracker(tileNumber) {
    if (tileNumber > 33) return; // don`t track bonus tiles explicitly
    let tile = this.knowledge.querySelector(`game-tile[tile='${tileNumber}']`);
    tile.remove();
  }

  /**
   * Bind the rules to this UI, which can be handy for
   * things like generating a rules/scoring explanation.
   */
  setRules(rules) {
    this.rules = rules;
  }

  /**
   * Effect a lock on the UI. Note that UI elements can still
   * listen for events like document.blur etc. on their own.
   */
  pause(lock) {
    this.paused = lock;
    if (this.countdownTimer) { this.countdownTimer.pause(); }
    // don`t mark as paused if the modal dialogs are open
    if (modal.isHidden()) {
      this.discards.classList.add(`paused`);
    }
  }

  /**
   * Release the lock on the UI.
   */
  resume() {
    this.discards.classList.remove(`paused`);
    if (this.countdownTimer) { this.countdownTimer.resume(); }
    this.paused = false;
  }

  /**
   * If we need to do anything once the claim timer
   * ticks over, that can get bound here.
   */
  setClaimTimerCleanup(fn) {
    this.claimCleanup = fn;
  }

  /**
   * Start a count-down bar that signals to the user
   * that there is `some time remaining` without
   * giving them (milli)second accurate numbers.
   */
  startCountDown(ms) {
    new TaskTimer(
      timer => {
        this.countdownTimer = timer;
      },
      () => {
        this.countdownTimer = false;
      },
      ms,
      (count) => {
        let fraction = count===10 ? 1 : count/10;
        this.bar.style.width = `${100 - 100 * fraction}%`;
        if (fraction === 1) {
          this.bar.classList.remove(`active`);
          this.countdownTimer = false;
          if (this.claimCleanup) this.claimCleanup();
          this.claimCleanup = false;
        }
      },
      10
    );

    this.bar.classList.add(`active`);
  }

  /**
   * Triggered at the start of the game, before any hand is
   * started, so that players can be reset properly if more
   * than one game is played consecutively.
   */
  gameWillStart() {
    rotateWinds.reset();
    playClip(`start`);
    this.playerbanks.forEach(b => {
      if (this.rules) b.dataset.score = this.rules.player_start_score;
      b.dataset.wins = 0;
    });
  }

  /**
   * Triggered after players have been dealt their initial
   * tiles, but before the first discard is prompted for.
   */
  handWillStart(redraw, resolve) {
    if (config.BOT_PLAY) return resolve();
    let heading = `Ready to start playing?`;
    if (redraw) heading = `Ready to replay hand?`;
    modal.choiceInput(heading, [{label: `ready!`,value: false}], resolve);
  }

  /**
   * Called right before play(), after all players have been given a chance
   * to declare any kongs, but right before the first player gets their
   * first player tile, to set up the first discard.
   */
  playWillStart() {
    // we don`t actually have any UI that needs to kick in at this point.
  }

  /**
   * Note how many tiles are left to be played with in the current hand.
   */
  markTilesLeft(remaining) {
    let ui = document.querySelector(`.wall.data`);
    ui.textContent = `${remaining} tiles left`;
  }

  /**
   * Have the player confirm whether they want to declare
   * a self-drawn kong or not.
   */
  async confirmKong(tile, resolve) {
    if (config.BOT_PLAY) return resolve(true);

    let cancel = () => resolve(false);
    modal.choiceInput(`Declare kong (${config.TILE_NAMES[tile]})?`, [
      { label: `Absolutely`, value: `yes` },
      { label: `No, I have plans for those tiles`, value: `no` },
    ], result => {
      if (result === `yes`) resolve(true);
      else resolve(false);
    }, cancel);
  }

  /**
   * Several actions require removing the most recent discard,
   * such as players claiming it to form sets from their hand.
   */
  removeLastDiscard() {
    if (this.discards.lastChild) {
      this.discards.removeChild(this.discards.lastChild);
    }
  }

  /**
   * Triggered when play moves from one player to another.
   */
  nextPlayer() {
    this.discards.lastChild.unmark(`selectable`);
  }

  /**
   * Utility function: checks if this player is holding (at least one of) this tile.
   */
  haveSingle(tile) {
    let tiles = this.getAllTilesInHand(tile.dataset ? tile.getTileFace() : tile);
    return tiles.length >= 1;
  }

  /**
   * Utility function: checks if this player can form a pung with this tile.
   */
  canPung(tile) {
    let tiles = this.getAllTilesInHand(tile.dataset ? tile.getTileFace() : tile);
    return tiles.length >= 2;
  }

  /**
   * Utility function: checks if this player can form a kong with this tile.
   */
  canKong(tile) {
    let tiles = this.getAllTilesInHand(tile.dataset ? tile.getTileFace() : tile);
    return tiles.length === 3;
  }

  /**
   * Utility function: checks if this player can form a particular type of
   * chow with this tile either as first, second, or third tile in the set.
   */
  canChow(tile, type) {
    tile = (tile.dataset ? tile.getTileFace() : tile);
    if (tile > 26) return false;
    let face = tile % 9;
    let t1, t2;
    if (type === CLAIM.CHOW1) {
      if (face > 6) return false;
      t1 = tile + 1;
      t2 = tile + 2;
    }
    if (type === CLAIM.CHOW2) {
      if (face===0 || face===8) return false;
      t1 = tile - 1;
      t2 = tile + 1;
    }
    if (type === CLAIM.CHOW3) {
      if (face < 2) return false;
      t1 = tile - 2;
      t2 = tile - 1;
    }
    return this.getSingleTileFromHand(t1) && this.getSingleTileFromHand(t2);
  }


  /**
   * Triggered when either the hand was a draw, or someone won,
   * with the full game disclosure available in case of a win.
   */
  endOfHand(disclosure, force_reveal_player=false) {
    if (!disclosure) {
      playClip(`draw`);
      this.discards.classList.add(`exhausted`);
      return;
    }

    if (!force_reveal_player) playClip(`win`);

    disclosure.forEach( (res,id) => {
      if (id == this.id && !force_reveal_player) return;
      let bank = this.playerbanks[id];
      bank.innerHTML = ``;
      bank.setAttribute(`class`, `player`);

      res.bonus.forEach(t => {
        t = create(t);
        t.bonus();
        bank.appendChild(t);
      });

      let locknum = 1 + this.getLockedTiles(bank).length;

      res.locked.forEach(s => {
        s.forEach(t => {
          let n = create(t.getTileFace());
          n.lock(locknum);
          if (t.isWinningTile()) n.winning();
          bank.appendChild(n);
        });
        locknum += s.length;
      });

      res.concealed.sort((a,b)=>(a-b)).forEach(t => bank.appendChild(create(t)));

      if (res.winner) {
        this.discards.classList.add(`winner`);
        bank.classList.add(`winner`);
      }

      bank.dataset.wincount = res.wincount;
      this.sortTiles(bank);
    });
  }

  /**
   * Triggered after all hands have been played and the game is over,
   * with the full score history for the game available for presenting
   * to the user.
   */
  endOfGame(scores) {
    rotateWinds.done();
    playClip(`end`);

    let v=0, b=-1;
    scores.forEach( (score,id) => { if (score>v) { v = score; b = id; }});
    this.playerbanks.forEach( (bank,id) => {
      bank.classList.remove(`waiting`);
      bank.classList.remove(`winner`);
      if (id===b) bank.classList.add(`game-winner`);
    });

    // clear out the player banks, discards, and tile tracker.
    let remove = [];
    this.playerbanks.forEach(bank => {
      remove = [...remove, ...bank.querySelectorAll(`game-tile`)];
    });
    remove = [...remove, ...this.discards.querySelectorAll(`game-tile`)];
    remove.forEach(t => t.parentNode.removeChild(t));

    // and then for aesthetic purposes, fill the player banks and tracker
    this.playerbanks.forEach(bank => {
      new Array(13).fill(-1).forEach(t => bank.appendChild(create(t)));
    });

    this.tracker.reset();
  }

  /**
   * Locally record the scores for a played hand.
   */
  recordScores(scores) {
    scores.forEach((score, b) => {
      let d = this.playerbanks[b].dataset;
      if (!d.score) d.score = 0;
      d.score = parseInt(d.score) + score;
    });
  }

  /**
   * At the end of the game, people can go through the scores
   * and see which tiles weres associated with that.
   */
  loadHandPostGame(disclosure) {
    this.endOfHand(disclosure, true);
  }

  /**
   * Triggered at the start of a hand, stating which
   * hand this is, and what its wind of the round is.
   */
  markHand(hand, wind) {
    this.el.dataset.wind = [`東`,`南`,`西`,`北`][wind];
  }

  /**
   * Mark the player with `id` as the currently active player.
   */
  activate(id) {
    this.playerbanks.forEach(bank => bank.classList.remove(`active`));
    this.playerbanks[id].classList.add(`active`);
    if (id != this.id) {
      let latest = this.el.querySelector(`game-tile.latest`);
      if (latest) latest.unmark(`latest`);
    }
  }

  /**
   * Visually unmark this player as active (this function is
   * called specifically on whoever is currently activ)
   */
  disable() {
    this.el.classList.remove(`active`);
  }

  /**
   * Visually mark this player as waiting to win.
   */
  markWaiting(val) {
    if (val) this.el.classList.add(`waiting`);
    else this.el.classList.remove(`waiting`);
  }

  /**
   * Visually mark this player as having won.
   */
  markWinner(wincount) {
    this.el.dataset.wincount = wincount;
    this.el.classList.add(`winner`);
    this.el.classList.remove(`active`);
  }

  /**
   * Add a tile to this player`s tilebank.
   */
  append(t) {
    let old = this.el.querySelector(`game-tile.latest`);
    if (old) {
      old.unmark(`latest`);
      old.setTitle(``);
    }
    if (!t.isLocked()) {
      t.mark(`latest`);
      t.setTitle(`latest tile`);
    }
    this.el.appendChild(t);
    this.sortTiles();
  }

  /**
   * Remove a tile from this player`s tile bank
   */
  remove(tile) {
    this.el.removeChild(tile);
  }

  /**
   * Show this player as locking down a set formed
   * from tiles in their hand, and the current discard
   */
  lockClaim(tiles) {
    playClip(tiles.length===4 ? `kong` : `multi`);

    this.removeLastDiscard();
    let locknum = 1 + this.getLockedTiles().length;
    tiles.forEach(tile => {
      tile.lock(locknum);
      this.append(tile);
    });
    this.sortTiles();
  }

  /**
   * Move the fourth tile in a locked set of three from the
   * player`s hand to that locked set.
   */
  meldKong(tile) {
    // find another tile like this, but locked, which can only be a pung.
    let other = this.el.querySelector(`game-tile[locked][tile='${tile.getTileFace()}']`);
    tile.lock(other.getLockNumber());
    this.el.appendChild(tile);
    this.sortTiles();
  }

  /**
   * Triggered when a player discards a tile from their hand.
   */
  playerDiscarded(player, tile, playcounter) {
    playClip(playcounter===1 ? `thud` : `click`);

    let bank = this.playerbanks[player.id];

    console.debug(`${this.id} sees discard ${tile} from ${player.id}`);

    if (player.id != this.id) {
      let blank = bank.querySelector(`[tile='-1']`);
      if (blank) bank.removeChild(blank);
    }

    let discard = create(tile);
    discard.mark(`discard`);
    discard.setFrom(player.id);
    this.discards.appendChild(discard);

    if (!config.BOT_PLAY && player.id !== this.id) {
      this.startCountDown(config.CLAIM_INTERVAL);
    }

    this.sortTiles(bank);
  }

  /**
   * See one or more tiles being revealed by a player.
   */
  see(tiles, player) {
    console.debug(`${this.id} sees ${tiles.map(t => t.dataset ? t.getTileFace() : t)} from ${player.id}`);

    let bank = this.playerbanks[player.id];

    // create a new locked set
    let locknum = 1 + bank.querySelectorAll(`[locked]`).length;
    tiles.forEach(tile => {
      let face = (tile.dataset ? tile.getTileFace() : tile);

      if (player.id != this.id) {
        // remove a `blank` tile to replace with the one we`re seeing.
        let blank = bank.querySelector(`[tile='-1']`);
        if (blank) bank.removeChild(blank);
      }

      let e = create(face);
      if (tile.isHidden && tile.isHidden()) e.hide();
      e.lock(locknum);
      bank.appendChild(e);
    });

    this.sortTiles(bank);
  }

  /**
   * see a reveal by a player specifically as a result
   * of claiminig a tile.
   *
   * This function falls through to `see()`
   */
  seeClaim(tiles, player, claim) {
    playClip(tiles.length===4 ? `kong` : `multi`);

    // this differs from see() in that we know we need to remove one
    // `blank` tile fewer than are being revealed. So we add one, and
    // then call see() to offset the otherwise superfluous removal.
    let bank = this.playerbanks[player.id];
    let blank = create(-1);
    bank.appendChild(blank);
    this.removeLastDiscard();
    this.see(tiles, player);

    // add a visual signal
    if (!config.BOT_PLAY) {
      this.renderClaimAnnouncement(player.id, claim.claimtype);
    }
  }

  /**
   * Take note of a player having to give up a kong
   * because someone just robbed it to win.
   */
  playerGaveUpKongTile(pid, tilenumber) {
    let bank = this.playerbanks[pid];
    let tile = bank.querySelector(`game-tile[locked][tile='${tilenumber}']`);
    tile.remove();
  }

  /**
   * Render a UI element that notified the user that some
   * other player claimed the discard for some purpose.
   */
  renderClaimAnnouncement(pid, claimtype) {
    let label = `win`;
    if (claimtype === 16) label = `kong`;
    if (claimtype === 8) label = `pung`;
    if (claimtype < 8) label = `chow`;
    let ann = document.createElement(`div`);
    ann.classList.add(`announcement`);
    ann.textContent = `${label}!`;
    ann.dataset.player = pid;
    let parent = document.querySelector(`.board`);
    parent.appendChild(ann);
    // transitionend seems to do all of nothing.
    setTimeout(() => ann.parentNode.removeChild(ann), 2300);
  }

  /**
   * Mark the fact that a player received `a tile`,
   * but we don`t know specifically which tile.
   */
  receivedTile(player) {
    if (player.id === this.id) return;
    let bank = this.playerbanks[player.id];
    bank.append(create(-1));
    this.sortTiles(bank);
  }

  /**
   * Sort all the tiles in a player`s tile bank
   * (either the user, or one of the bot players).
   */
  sortTiles(bank) {
    bank = (bank||this.el);
    Array
    .from(bank.querySelectorAll(`game-tile`))
    .sort(this.tilebank_sort_function)
    .forEach(tile => bank.appendChild(tile));
  }

  /**
   * Get all `locked=locked` tiles in a player`s tile bank.
   */
  getLockedTiles(bank) {
    return (bank||this.el).querySelectorAll(`game-tile[locked]`);
  }

  /**
   * Get all tiles in a player`s tile bank that are not locked, and not bonus tiles
   */
  getAvailableTiles() {
    return this.el.querySelectorAll(`game-tile:not([bonus]):not([locked])`);
  }

  /**
   * Find a single instance of a tile with the specified tile number,
   * or undefined if no such tile exists in the player`s hand.
   */
  getSingleTileFromHand(tileNumber) {
    return this.el.querySelector(`game-tile[tile='${tileNumber}']:not([locked])`);
  }

  /**
   * Get every instance of a specific tile in the player`s hand.
   */
  getAllTilesInHand(tileNumber) {
    return this.el.querySelectorAll(`game-tile[tile='${tileNumber}']:not([locked])`);
  }

  /**
   * Get either all tiles, or all `not locked` tiles.
   */
  getTiles(allTiles) {
    return this.el.querySelectorAll(`game-tile${allTiles ? ``: `:not([locked])`}`);
  }

  /**
   * Get the list of tiles as tile numbers, or all `not locked` tiles as tile numbers.
   */
  getTileFaces(allTiles) {
    return Array.from(this.getTiles(allTiles)).map(t => t.getTileFace());
  }

  /**
   * Sort tiles ordered as:
   * 1: bonus tiles
   * 2: locked tiles, sorted
   * 3: unlocked tiles, sorted
   * 4: concealed tiles
   */
  tilebank_sort_function(a,b) {
    try {
      let la = a.getLockNumber();
      let lb = b.getLockNumber();

      a = a.getTileFace();
      b = b.getTileFace();

      // 1: bonus tiles always go on the far left
      if (a>33 || b>33) {
        if (a>33 && b>33) return a-b;
        if (a>33) return -1;
        return 1;
      }

      // 2: locked tiles
      if (la || lb) {
        if (la && lb) return (la===lb) ? a - b : la - lb;
        if (la) return -1;
        return 1;
      }

      // 4 (out of order): for concealed tiles to the right
      if (a===-1) return 1;
      if (b===-1) return -1;

      // 3: plain compare for regular tiles
      return a - b;
    }
    catch (e) {
      console.log(a, b);
      console.log(a.constructor.name, b.constructor.name);
      throw (e);
    }
  }
}

export { ClientUIMaster };
