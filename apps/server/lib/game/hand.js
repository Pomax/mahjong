var logger = require('../../../../lib/logger');
var Constants = require('../../../../lib/constants');
var Listener = require('./protocol/listener');
var Player = require('./player');
var Wall = require('./wall');

var Hand = function(game, ruleset, handid, players, east) {
  // player that starts as east
  east = east || 0;

  // hand data
  this.id = handid;
  this.game = game;
  this.ruleset = ruleset;
  this.players = players;
  this.wall = new Wall();
  this.currentPlayer = 0;
  this.listeners = {};

  // turn information
  this.turn = 1;
  this.rotations = 0;
  this.windoftheround = 0;

  // logger
  this.log = logger('game', game.id, 'hand', handid);
};

Hand.prototype = {

  /**
   * Called by players (via socket) to signal they are ready to play the next hand.
   */
  handleRestartReady() {
    this.log("received a restartready");
    this.restartready++;
    // we want to wait to make sure players are ready before we begin the next hand.
    if (this.restartready < this.players.length) return;
    this.startNewHand();
  },

  /**
   * called after a hand is won, or drawn.
   */
  startNewHand(won) {
    this.log("starting next hand");

    // do we need to rotate the players?
    var direction = this.ruleset.rotate(won);
    if (direction) {
      this.log("rotating players");
      if (direction>0) {
        var head = this.players.splice(0,1);
        this.players = this.players.concat(head);
      } else {
        var tail = this.players.splice(-1,1);
        this.players = tail.concat(this.players);
      }
      this.rotations++;
    }
    if (this.rotations % this.players.length === 0) {
      this.log("rotating wind of the round");
      this.windoftheround++;
    }

    // Play stops once the wind of the round comes back to East
    if (this.windoftheround===4) {
      return this.log("GAME ENDED");
    }

    this.turn++;
    this.wall.reset();
    this.currentPlayer = 0;
    this.start();
  },

  /**
   * ...
   */
  start() {
    this.log("turn",this.turn,"start");
    this.ready = 0;
    this.players.forEach((player, playerposition) => {
      process.nextTick(() => {
        this.initialSetup(player, playerposition);
      });
    });
  },

  /**
   * ...
   */
  initialSetup(player, playerposition) {
    // set up protocol listener and emitter, with known security values
    var gameid = this.game.id;
    var handid = this.id;
    var playerid = player.id;

    var securities = { gameid, handid, playerid, playerposition };

    // set up the protocol listener and emitter for this player
    if (!player.isBot) {
      if (Object.keys(this.listeners).length < this.players.length) {
        this.log("setting up socket listeners for player",playerposition);

        this.mustMatch = Object.keys(securities);
        var listener = new Listener(player.socket, securities);
        this.listeners[playerid] = listener;

        // set up protocol handling for actions taken by players while playing a hand.
        listener.discard(this);
        listener.claim(this);
        listener.compensate(this);
        listener.reveal(this);
        listener.verify(this);
        listener.confirm(this);
        listener.restartready(this);
        listener.kongDeclaration(this);
        listener.winDeclaration(this);

      } else {
        this.listeners[playerid].updateSecurities(securities);
      }
    }

    var state = {gameid, handid, playerid, playerposition};
    player.bindHand(this, state);
  },

  handleConfirmed(playerposition) {
    this.ready++;
    this.log(playerposition,"confirmed, ",this.ready,"players ready");
    if (this.ready<this.players.length) return;
    this.startPlay();
  },

  /**
   * ...
   */
  startPlay() {
    this.log("starting wall:", this.wall.tiles.slice(0).join(','));
    this.players.forEach((player, playerposition) => {
      // deal a player their initial tiles
      var tiles = this.wall.deal(Constants.HANDSIZE - 1);
      this.log("dealing",tiles.length,"initial tiles to",playerposition);
      player.setHand(tiles.sort((a,b) => a-b));

      // notify the other players that someone was dealt their initial tiles
      this.players.forEach(p => {
        if (p===player) return;
        p.dealtTiles(playerposition, tiles.length);
      });
    });

    this.log("starting game loop");
    process.nextTick(() => this.deal());
  },

  /**
   * ...
   */
  deal() {
    var tile = this.wall.draw();
    if (tile === Constants.NOTILE) {
      this.log("hand was a draw");
      this.players.forEach(player => {
        player.drawOccured();
      });
      return;
    }

    var cpos = this.currentPlayer;
    var player = this.players[cpos];

    this.log("dealing",tile,"to",cpos);
    this.log("tiles left in the wall:", this.wall.playlength());
    player.deal(tile);
    this.players.forEach((player,pos) => {
      if (pos===cpos) return;
      this.log("notifying",pos,"a tile was dealt");
      player.drew(cpos);
    });
    if (player.isBot) { player.doDiscard(); }

    this.log("player",cpos,"tiles:",this.players[cpos].tiles.sort());
  },

  /**
   * ...
   */
  handleDiscard(playerposition, tile) {
    this.claims = [];

    // FIXME: TODO: give the player a grace period to take back the discard.
    //              Because we're all human here. Unless it's an AI. Then: too bad.
    this.log("player",playerposition,"discarded",tile);
    this.players[playerposition].discard(tile);
    this.players.forEach((player,pos) => {
      player.discarded(playerposition,tile);
    });

    // We will wait all claims to come in. If none do, we continue the round.
    var timeout = this.hand_timeout || Constants.HAND_TIMEOUT;
    this.roundTimeout = setTimeout(this.next.bind(this, tile), timeout);
  },

  /**
   * ...
   */
  next(discardTile) {
    if (this.claims.length === 0) {
      this.players.forEach(player => player.unclaimed(discardTile));
      var oldplayer = this.currentPlayer;
      this.currentPlayer = (oldplayer + 1) % this.players.length;
      this.log("active player:",oldplayer,"=>",this.currentPlayer);
      this.deal();
    }

    // claims pending
    else {
      clearTimeout(this.roundTimeout);
      this.roundTimeout = false;
      this.processClaims(discardTile);
    }
  },

  /**
   * ...
   */
  handleClaim(playerid, playerposition, tile, claimType, winType) {
    var player = this.players[playerposition];
    var canClaim = false;
    if (claimType === Constants.NOTILE) {
      player.declineClaim(tile, claimType);
    } else {
      canClaim = this.ruleset.canClaim(player, tile, claimType, winType);
      if (!canClaim) {
        player.declineClaim(tile, claimType);
      }
    }
    this.claims.push({ player, tile, claimType, winType, canClaim });
  },

  /**
   * ...
   */
  processClaims(discardTile) {
    // copy and reset the claims array, to prevent infinite recursion when we hit next() later.
    var claims = this.claims.filter(e => e.canClaim);
    this.claims = [];
    claims.sort((a,b) => b.claimType - a.claimType);
    // it's possible that everyone submitted a nonsense claim, so despite
    // having three claims, none of them are worth bothering with:
    if (claims.length === 0) {
      return this.next(discardTile);
    }
    // at least 1 person has a good claim, so award the claim and go into claim processing
    var best = claims.splice(0,1)[0];
    this.awardClaim(best.player.id, best.player.playerposition, best.tile, best.claimType, best.winType);
  },

  /**
   * ...
   */
  awardClaim(playerid, playerposition, tile, claimType, winType) {
    var players = this.players;
    var player = players[playerposition];

    this.log("player",playerposition,"can claim",tile,"as",claimType,"(wintype:"+winType+")");

    // if this was a winning claim, the hand is over.
    if (claimType === Constants.WIN) {
      this.log("player",playerposition,"("+player.id+")","has won.");
      player.awardWinningClaim(this.ruleset, tile, claimType, winType);

      this.log("notifying players of win");
      players.forEach((player, idx) => {
        if (idx!==playerposition) {
          player.claimOccurred(playerposition, tile, winType);
        }
      });

      this.log("end of hand.");
      players.forEach((player, idx) => {
        player.winOccurred(playerposition, tile, winType, this.players);
      });

      // compute scores
      this.ruleset.score(players, this.windoftheround).forEach((balance, pid) => {
        this.players[pid].adjustBalance(balance);
      });

      // and now we wait (well, not really) for "restartready" events from players
      this.restartready = 0;
    }

    // if it wasn't, the claim is let through and play continues
    else {
      player.acceptClaim(this.ruleset, tile, claimType, winType);

      // if this was a kong, player needs a compesation tile.
      if(claimType === Constants.KONG) {
        var tile = this.wall.drawSupplement();
        player.getKongCompensation(tile);
      }

      // notify other players of claim
      this.players.forEach((player, idx) => {
        if (idx===playerposition) return;
        player.claimOccurred(playerposition, tile, claimType);
      })

      // mark claiming player the active player
      this.currentPlayer = playerposition;
    }
  },

  /**
   * ...
   */
  handleCompensate(playerid, playerposition, tiles) {
    // FIXME: TODO: this should probably be handled in the player object?
    var fair = true;
    for(var i=0; i<tiles.length; i++) {
      if (tiles[i] < Constants.BONUS) {
        fair = false;
        break;
      }
    }

    if (!fair) {
      return this.log("ERROR", "player requested unfair compensation for", tiles);
    }

    this.log("sending player",playerposition,"bonus compensation tile(s)");

    var player = this.players[playerposition];
    var compensationTiles = this.wall.deal(tiles.length);
    this.log("tile(s):",compensationTiles);
    player.getCompensation(tiles, compensationTiles);

    this.players.forEach(p => {
      if (p===player) return;
      p.gotCompensation(playerposition, tiles);
    });
  },

  /**
   * ...
   */
  handleReveal(playerposition, set, concealed) {
    this.players.forEach((p, pos) => {
      if (pos === playerposition) return;
      p.revealedSet(playerposition, set, concealed);
    });
  },

  /**
   * ...
   */
  handleVerify(playerposition, digest, tiles, bonus, revealed) {
    this.players[playerposition].verify(digest, tiles, bonus, revealed);
  },

  /**
   * A player wants to declare a kong in hand.
   */
  handleKongDeclaration(playerposition, tile) {
    var player = this.players[playerposition];
    if (player.hasKong(tile)) {
      var compensation = this.wall.drawSupplement();
      player.allowKongDeclaration(this.ruleset, tile, compensation);
    } else {
      player.disallowKongDeclaration(tile);
    }
  },

  /**
   * A player wants to verify that they can win with their current hand.
   */
  handleWinDeclaration(playerposition) {
    var players = this.players,
        player = players[playerposition];

    if (this.ruleset.canClaimSelfDrawnWin(player)) {

      // DRY this out, it's very similar to the code in handleClaim()

      this.log("player",playerposition,"("+player.id+")","has won.");
      player.allowWin(this.ruleset);

      this.log("notifying players of win");
      players.forEach((player, idx) => {
        player.winOccurred(playerposition, Constants.SELF_DRAWN_WIN);
      });
      this.log("end of hand.");

      // compute scores
      this.ruleset.score(players, this.windoftheround).forEach((balance, pid) => {
        this.players[pid].adjustBalance(balance);
      });

      // and now we wait (well, not really) for "restartready" events from players
      this.restartready = 0;
    }

    else {
      player.disallowWin();
      // Depending on the rules, the hand is now over, and the player calling
      // a win despite not winning may be penalized.
      if (this.ruleset.END_HAND_ON_ILLEGAL_WIN) {

        // DRY this out, it's very similar to the above and handleClaim() code.

        this.log("notifying players of illegal win declaration");
        players.forEach((player, idx) => {
          player.illegalWinOccurred(playerposition);
        });
        this.log("end of hand.");

        // compute scores
        this.ruleset.resolveIllegalWin(this.players, player).forEach((balance, pid) => {
          this.players[pid].adjustBalance(balance);
        });

        // and now we wait (well, not really) for "restartready" events from players
        this.restartready = 0;
      } else {
        // no repercussions, just "not allowed to win"
      }
    }

  }
};

module.exports = Hand;
