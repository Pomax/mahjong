import { config, CLAIM } from "../../../../config.js";
import { modal } from "../../../page/modal/modal.js";
import { ClientUIMaster } from "./client-ui-master.js";
import { lock_vk_signal, vk_signal_lock, VK_LEFT, VK_RIGHT, VK_UP, VK_DOWN, VK_START, VK_END, VK_SIGNAL } from "../../../page/virtual-keys.js";


/**
 * This is a graphical interface that players can use
 * to visualise their game knowledge, and allow external
 * interaction (human overrides for bots, or just plain
 * human input for... well, humans)
 */
class ClientUI extends ClientUIMaster {
  constructor(player, tracker) {
    super(player, tracker);
    this.listeners = [];
    this.longPressTimeout = false;
  }

  listen(target, event, handler) {
    this.listeners.push({ target, event, handler });
    let opts = {};
    if (event.indexOf('touch') !== -1) opts.passive = true;
    target.addEventListener(event, handler, opts);
  }

  removeListeners(target, event) {
    let removals = this.listeners.filter(data => (data.target === target && data.event===event));
    removals.forEach(data => {
      let opts = {};
      if (data.event.indexOf('touch') !== -1) opts.passive = true;
      data.target.removeEventListener(data.event, data.handler, opts);
    });
    this.listeners = this.listeners.filter(data => (data.target !== target || data.event !== event));
    // return a "restore()" function that turns listening back on.
    return () => removals.forEach(data => this.listen(data.target, data.event, data.handler));
  }

  removeAllListeners() {
    let removals = this.listeners;
    removals.forEach(data => {
      let opts = {};
      if (data.event.indexOf('touch') !== -1) opts.passive = true;
      data.target.removeEventListener(data.event, data.handler, opts);
    });
    this.listeners = [];
    return () => removals.forEach(data => this.listen(data.target, data.event, data.handler));
  }

  pause(lock) {
    super.pause(lock);
    if(this.claimTimer) this.claimTimer.pause();
  }

  resume() {
    super.resume();
    if(this.claimTimer) this.claimTimer.resume();
  }

  /**
   * Called by `determineDiscard` in human.js, this function
   * lets the user pick a tile to discard through the GUI.
   */
  listenForDiscard(resolve, suggestions, lastClaim, winbypass) {
    // Figure out the initial tile to highlight
    let tiles = this.getAvailableTiles();
    let currentTile = this.currentTile = this.player.latest;
    let curid = currentTile ? Array.from(tiles).indexOf(currentTile) : 0;
    if (curid === -1) curid = 0;
    this.markCurrentTile(curid);

    // highlight the discard suggestion
    this.highlightBotSuggestions(suggestions);

    // If we have no tiles left to discard, that's
    // an automatic win declaration.
    if (tiles.length === 0) return resolve(undefined);

    // If we just claimed a win, that's also
    // an automatic win declaration.
    if (lastClaim && lastClaim.claimtype === CLAIM.WIN) return resolve(undefined);

    // If the bot knows we have a winning hand,
    // let the user decide whether to declare a
    // win or whether to keep playing.
    let { winner } = this.player.tilesNeeded();
    if (winner && !winbypass) return this.askForWinConfirmation(resolve);

    // tag all tiles to allow for CSS highlighting
    tiles.forEach(tile => tile.mark('selectable'));

    // Add keyboard and mouse event listening for navigating
    // the selectable tiles and picking a discard.
    this.listen(document, "keydown", evt => this.listenForDiscardFromKeys(evt, tiles, suggestions, resolve));
    this.listenForDiscardFromMouse(tiles, suggestions, resolve);
  }

  /**
   * Mouse/touch interaction for discard selection.
   */
  listenForDiscardFromMouse(tiles, suggestions, resolve) {
    tiles.forEach(tile => this.addMouseEventsToTile(tile, suggestions, resolve));
  }

  /**
   * Add both mouse and touch event handling to all
   * (discardable) tiles in the player's tilebank.
   */
  addMouseEventsToTile(tile, suggestions, resolve) {
    console.log(tile, suggestions);
    this.listen(tile, "mouseover", evt => this.highlightTile(tile));
    this.listen(tile, "click", evt => this.discardCurrentHighlightedTile(suggestions, resolve));
    this.listen(tile, "mousedown", evt => this.initiateLongPress(evt, suggestions, resolve));
    this.listen(tile, "touchstart", evt => this.initiateLongPress(evt, suggestions, resolve));
  }

  /**
   * Keyboard interaction for discard selection.
   */
  listenForDiscardFromKeys(evt, tiles, suggestions, resolve) {
    let code = evt.keyCode;
    let willBeHandled = [VK_LEFT, VK_RIGHT, VK_UP, VK_DOWN, VK_SIGNAL, VK_START, VK_END].some(supported => supported[code]);
    if (!willBeHandled) return;
    if (VK_SIGNAL[code] && evt.repeat) return; // ignore all "action" key repeats

    evt.preventDefault();

    // Handling for moving the highlight from one tile to another.
    let tlen = tiles.length;
    let currentTile = this.currentTile;
    let curid = this.curid;
    if (VK_LEFT[code]) curid = (currentTile === false) ? tlen - 1 : (curid === 0) ? tlen - 1 : curid - 1;
    if (VK_RIGHT[code]) curid = (currentTile === false) ? 0 : (curid === tlen-1) ? 0 : curid + 1;
    if (VK_START[code]) curid = 0;
    if (VK_END[code]) curid = tlen-1;
    currentTile = this.markCurrentTile(curid);

    // "up"/"signal" is the discard action.
    if (VK_UP[code] || VK_SIGNAL[code]) {
      if (!vk_signal_lock) {
        lock_vk_signal();
        this.currentTile.unmark('highlight');
        this.discardCurrentHighlightedTile(suggestions, resolve);
      }
    }

    // "down" is used to declared self-drawn kongs and self-drawn wins.
    if (VK_DOWN[code]) this.spawnDeclarationModal(suggestions, resolve);
  }

  /**
   * Highlight a particular tile
   */
  highlightTile(tile) {
    let tiles = this.getAvailableTiles();
    let curid = Array.from(tiles).indexOf(tile);
    this.markCurrentTile(curid);
  }

  /**
   * Highlight a particular tile
   */
  markCurrentTile(curid) {
    let tiles = this.getAvailableTiles();
    if (tiles.length === 0) return;
    this.curid = curid;
    this.currentTile = tiles[curid];
    tiles.forEach(tile => tile.unmark('highlight'));
    this.currentTile.mark('highlight');
    return this.currentTile;
  };


  /**
   * Initiate a longpress timeout. This will get cancelled by
   * the discard action, as well as by touch-up events.
   */
  initiateLongPress(evt, suggestions, resolve) {
    let releaseEvents = ['mouseup', 'dragend', 'touchend'];
    if (evt.type === 'mousedown' && evt.which !== 1) return;
    if (!this.longPressTimeout) {
      this.longPressTimeout = setTimeout(() => {
        console.log('removing document mouseup/touchend');
        releaseEvents.forEach(event => this.removeListeners(document, event));
        this.cancelLongPress();
        let restoreClickHandling = this.removeListeners(evt.target, "click");
        this.spawnDeclarationModal(suggestions, resolve, restoreClickHandling);
      }, 1000);
    }
    let cancelPress = evt => this.cancelLongPress(evt)
    releaseEvents.forEach(event => this.listen(document, event, cancelPress));
  };

  /**
   * cancel a long-press timeout
   */
  cancelLongPress(evt) {
    if (this.longPressTimeout) {
      this.longPressTimeout = clearTimeout(this.longPressTimeout);
    }
  }

  /**
   * Highlight the tile that the superclass would discard if they were playing.
   */
  highlightBotSuggestions(suggestions) {
    if (config.SHOW_BOT_SUGGESTION && suggestions) {
      suggestions.forEach(suggestion => {
        if (!suggestion) return;
        let suggestedTile = this.getSingleTileFromHand(suggestion.getTileFace());
        if (suggestedTile) {
          suggestedTile.mark('suggestion');
          suggestedTile.setTitle('Bot-recommended discard.');
        } else {
          console.log(`The bot got confused and wanted you to throw out something that's not in your hand...!`);
          console.log(suggestion);
        };
      });
    }
  }

  /**
   * The user can win with the tiles they currently have. Do they want to?
   */
  askForWinConfirmation(resolve) {
    // console.log('scent of claim?', this.id, ':', this.player.lastClaim);

    let cancel = () => resolve(undefined);
    modal.choiceInput("Declare win?", [
      { label: 'You better believe it!', value: 'win' },
      { label: 'No, I think I can do better...', value: '' },
    ], result => {
      if (result) {
        if (!this.player.lastClaim) {
          this.player.selfdraw = true;
        }
        resolve(undefined);
      }
      else this.listenForDiscard(resolve, undefined, undefined, true); // suggestions, lastClaim, winbypass
    }, cancel);
  }

  /**
   * Discard a selected tile from the player's hand
   */
  discardCurrentHighlightedTile(suggestions=[], resolve) {
    let tiles = this.getAvailableTiles();
    this.cancelLongPress();
    suggestions.forEach(suggestion => {
      if (suggestion) {
        suggestion.unmark('suggestion');
        suggestion.setTitle('');
      }
    })
    let latest = this.player.latestTile;
    if (latest) latest.unmark('latest');
    tiles.forEach(tile => tile.unmark('selectable','highlight','suggestion'));
    this.removeAllListeners();
    resolve(this.currentTile);
  }

  /**
   * Called in several places in `listenForDiscard`, this function
   * spawns a modal that allows the user to declaring they can
   * form a kong or that they have won on their own turn.
   */
  spawnDeclarationModal(suggestions, resolve, restore) {
    let currentTile = this.currentTile;
    let face = currentTile.getTileFace();
    let allInHand = this.getAllTilesInHand(face);
    let canKong = false;

    // do we have a concealed kong?
    if (allInHand.length === 4) canKong = true;

    // can we meld a kong?
    else if (this.player.locked.some(set => set.every(t => t.getTileFace()==face))) canKong = true;

    // can we declare a standard win?
    let { winpaths } = this.player.tilesNeeded();
    let canWin = winpaths.length > 0;

    // can we declare a limit hand?
    if (!canWin) {
      let allTiles = this.getTileFaces(true).filter(t => t<34);
      canWin = this.player.rules.checkForLimit(allTiles);
    }

    // build the self-declare options for this action
    let options = [
      { label: "on second thought, never mind", value: CLAIM.IGNORE },
      canKong ? { label: "I'm declaring a kong", value: CLAIM.KONG } : false,
      canWin ? { label: "I just won", value: CLAIM.WIN } : false
    ].filter(v=>v);

    modal.choiceInput("Declare a kong or win?", options, result => {
      if (result === CLAIM.IGNORE) {
        if (restore) return restore();
      }
      if (result === CLAIM.KONG) {
        currentTile.exception = CLAIM.KONG;
        currentTile.kong = [...allInHand];;
        return this.discardCurrentHighlightedTile(suggestions, resolve);
      }
      if (result === CLAIM.WIN) {
        this.currentTile = undefined;
        return this.discardCurrentHighlightedTile(suggestions, resolve);
      }
    });
  }

  /**
   * Called by `determineClaim` in human.js, this function
   * lets the user decide whether or not to claim the discard
   * in order to form a specific set, or even win.
   */
  listenForClaim(pid, discard, suggestion, resolve, interrupt, claimTimer) {
    let tile = this.discards.lastChild;
    let mayChow = this.player.mayChow(pid);

    // make sure that all events we set up get removed when the timer ticks over.
    this.claimTimer = claimTimer;
    this.setClaimTimerCleanup(() => this.removeAllListeners());

    // show general claim suggestions
    if (config.SHOW_CLAIM_SUGGESTION) {
      this.tryClaimHighlight(pid, tile, mayChow);
    }

    // show the bot's play suggestions
    if (config.SHOW_BOT_SUGGESTION && suggestion) {
      if (suggestion && suggestion.claimtype) {
        tile.mark('suggestion');
      }
    }

    // an unpause protection, so that a mousedown/touchstart that
    // resumes a paused state does not then also allow the click
    // from the same event interaction to go through
    this.pause_protection = false;

    // Start listening for discard claim events
    this.setupInputListening(tile, mayChow, interrupt, resolve);
  }

  /**
   * Set up all the event listening necessary to enable
   * keyboard and mouse triggers for claims.
   */
  setupInputListening(tile, mayChow, interrupt, resolve) {
    tile.mark('selectable');
    let discards = this.discards;
    this.listen(tile, "click",  evt => this.triggerClaimDialog(tile, mayChow, interrupt, resolve));
    this.listen(discards, "click", evt => this.safelyIgnoreDicard(evt, tile, mayChow, interrupt, resolve));
    this.listen(discards, "mousedown", evt => this.verifyPauseProtection());
    this.listen(discards, "touchstart", evt => this.verifyPauseProtection());
    this.listen(document, "keydown", evt => this.handleKeyDuringClaim(evt, tile, mayChow, interrupt, resolve));
  }

  /**
   * Set the pause protection flag based on
   * the current pause state.
   */
  verifyPauseProtection() {
    if (this.paused) {
      this.pause_protection = true;
    }
  };

  /**
   * Get the distance from a click event to the
   * center of the specified tile.
   */
  getDistanceToTile(evt, tile) {
    let bbox = tile.getBoundingClientRect();
    let midpoint = { x: (bbox.left + bbox.right)/2, y: (bbox.top + bbox.bottom)/2 };
    let vector = { x: midpoint.x - evt.clientX, y: midpoint.y - evt.clientY };
    return Math.sqrt(vector.x ** 2 + vector.y ** 2);
  }

  /**
   * Register that user interaction has occurred.
   */
  registerUIInput(interrupt) {
    if (this.countdownTimer) this.countdownTimer.cancel();
    interrupt();
  }

  /**
   * Handle key events during listenForClaim.
   */
  handleKeyDuringClaim(evt, tile, mayChow, interrupt, resolve) {
    // Prevent keyrepeat immediately kicking in off of a discard action, which uses the same signal:
    if (vk_signal_lock) return;

    let code = evt.keyCode;
    let willBeHandled = (VK_LEFT[code] || VK_RIGHT[code] || VK_UP[code] || VK_SIGNAL[code]);
    if (!willBeHandled) return;
    evt.preventDefault();
    this.removeAllListeners();
    if (VK_UP[code] || VK_SIGNAL[code]) return this.triggerClaimDialog(tile, mayChow, interrupt, resolve);
    return this.ignoreDiscard(tile, interrupt, resolve);
  }

  /**
   * Let the game know we're not interested in
   * claiming the current discard for anything.
   */
  ignoreDiscard(tile, interrupt, resolve) {
    this.registerUIInput(interrupt);
    tile.unmark('highlight');
    tile.unmark('suggestion');
    tile.unmark('selectable');
    this.removeAllListeners();
    resolve({ claimtype: CLAIM.IGNORE });
  }

  /**
   * This adds a safety region around the discarded tile, for
   * fat fingers, as well as unpause protection (not registering
   * as real "click" if we just resumed from a paused state).
   */
  safelyIgnoreDicard(evt, tile, mayChow, interrupt, resolve) {
    if (this.pause_protection) {
      return (this.pause_protection = false);
    }
    if (this.getDistanceToTile(evt, tile) > 40) {
      return this.ignoreDiscard(tile, interrupt, resolve);
    }
    this.triggerClaimDialog(tile, mayChow, interrupt, resolve);
  }

  /**
   * Can we highlight the latest discard as a signal
   * to the user that it's (technically, but not
   * necessarily practically) a claimable tile.
   */
  tryClaimHighlight(pid, tile, mayChow) {
    let face = tile.getTileFace();
    let suit = ((face/9)|0);
    let { lookout } = this.player.tilesNeeded();
    let types = lookout[face];

    if (types) {
      for(let type of types) {
        if (CLAIM.CHOW <= type && type < CLAIM.PUNG && !mayChow) continue
        return tile.mark('highlight');
      }
    }

    this.tryChowHighlight(tile, mayChow, face, suit);
  }

  /**
   * If we already have a chow with this tile in it, then
   * we might not actually _need_ this tile, and so lookout
   * won't list it. Even though it's a legal claim.
   */
  tryChowHighlight(tile, mayChow, face, suit) {
    if (mayChow && face < 27 && this.getSingleTileFromHand(face)) {
      let
      n1 = face < 26 && this.getSingleTileFromHand(face+1), sn1 = (((face+1)/9)|0),
      n2 = face < 25 && this.getSingleTileFromHand(face+2), sn2 = (((face+2)/9)|0),
      p2 = face > 1 && this.getSingleTileFromHand(face-2), sp2 = (((face-2)/9)|0),
      p1 = face > 0 && this.getSingleTileFromHand(face-1), sp1 = (((face-1)/9)|0),
      c1 = n2 && n1 && sn2===suit && sn1===suit,
      c2 = n1 && p1 && sn1===suit && sp1===suit,
      c3 = p2 && p1 && sp2===suit && sp1===suit;
      if (c1 || c2 || c3) tile.mark("highlight");
    }
  }

  /**
   * Set up the dialog spawning for when the user elects to stake a claim.
   */
  triggerClaimDialog(tile, mayChow, interrupt, resolve) {
    this.registerUIInput(interrupt);
    this.removeAllListeners();

    let cancel = () => this.ignoreDiscard(tile, interrupt, resolve);

    console.debug(this.player.id, tile, mayChow, this, this.canPung(tile));

    modal.choiceInput("What kind of claim are you making?", [
      { label: "Ignore", value: CLAIM.IGNORE },
      (mayChow && this.canChow(tile, CLAIM.CHOW1)) ? { label: "Chow (▮▯▯)", value: CLAIM.CHOW1 } : false,
      (mayChow && this.canChow(tile, CLAIM.CHOW2)) ? { label: "Chow (▯▮▯)", value: CLAIM.CHOW2 } : false,
      (mayChow && this.canChow(tile, CLAIM.CHOW3)) ? { label: "Chow (▯▯▮)", value: CLAIM.CHOW3 } : false,
      this.canPung(tile) ? { label: "Pung", value: CLAIM.PUNG } : false,
      this.canKong(tile) ? { label: "Kong", value: CLAIM.KONG } : false,
      { label: "Win", value: CLAIM.WIN }, // Let's not pre-filter this one
    ], result => {
      tile.unmark('highlight');
      tile.unmark('suggestion');
      tile.unmark('selectable');
      this.removeAllListeners();
      if (result === CLAIM.WIN) return this.spawnWinDialog(tile, resolve, cancel);
      resolve({ claimtype: result });
    }, cancel);
  }

  /**
   * Do we want to rob a kong to win?
   */
  spawnKongRobDialog(pid, tiles, tilesRemaining, suggestions, resolve) {
    let tile = tiles[0].getTileFace();
    let claim = false;

    if (suggestions && suggestions[0]) claim = suggestions[0];
    else {
      (() => {
        let { lookout, waiting } = this.player.tilesNeeded();
        if (!waiting) return;
        let need = lookout[tile];
        if (!need) return;
        let reasons = need.filter(v => v.indexOf('32')!==0);
        if (reasons.length === 0) return;
        claim = {
          from: pid,
          tile: tile,
          claimtype: CLAIM.WIN,
          wintype: (reasons[0]|0),
        };
      })();
    }

    if (!claim) return resolve();

    modal.choiceInput("Win by robbing a kong?", [
      { label: 'You better believe it!', value: 'win' },
      { label: 'No, I think I can do better...', value: '' },
    ], result => {
      if (result) return resolve(claim);
      resolve();
    }, () => resolve());
  }

  /**
   * Called in `listenForClaim`, this function spawns a modal
   * that allows tlistenForClhe user to claim a discard for the purposes
   * of declaring a win.
   */
  spawnWinDialog(discard, resolve, cancel) {
    // determine how this player could actually win on this tile.
    let { lookout } = this.player.tilesNeeded();

    let winOptions = { pair: false, chow: false, pung: false };
    let claimList = lookout[discard.getTileFace()];

    if (claimList) {
      claimList.forEach(type => {
        if (parseInt(type) === CLAIM.WIN) {
          let subtype = parseInt(type.split('s')[1]);
          if (subtype === CLAIM.PAIR) winOptions.pair = true;
          if (subtype >= CLAIM.CHOW && subtype < CLAIM.PUNG) winOptions.chow = true;
          if (subtype >= CLAIM.PUNG) winOptions.pung = true;
        }
      });
    }

    let options = [
      { label: "Actually, it doesn't", value: CLAIM.IGNORE },
      winOptions.pair ? { label: "Pair", value: CLAIM.PAIR } : false,
      winOptions.chow && this.canChow(discard, CLAIM.CHOW1) ? { label: "Chow (▮▯▯)", value: CLAIM.CHOW1 } : false,
      winOptions.chow && this.canChow(discard, CLAIM.CHOW2) ? { label: "Chow (▯▮▯)", value: CLAIM.CHOW2 } : false,
      winOptions.chow && this.canChow(discard, CLAIM.CHOW3) ? { label: "Chow (▯▯▮)", value: CLAIM.CHOW3 } : false,
      winOptions.pung ? { label: "Pung", value: CLAIM.PUNG } : false
    ];

    modal.choiceInput("How does this tile make you win?", options, result => {
      if (result === CLAIM.IGNORE) resolve({ claimtype: CLAIM.IGNORE });
      else resolve({ claimtype: CLAIM.WIN, wintype: result });
    }, cancel);
  }
}

export { ClientUI };
