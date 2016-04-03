var logger = require('../logger');
var Constants = require('../constants');
var Listener = require('./protocol/listener');
var Player = require('./player');
var Wall = require('./wall');

var Hand = function(game, ruleset, handid, players, east) {
  east = east || 0;
  this.id = handid;
  this.game = game;
  this.ruleset = ruleset;
  this.players = players;
  this.wall = new Wall();
  this.currentPlayer = east;
  this.log = logger('game', game.id, 'hand', handid);
};

Hand.prototype = {

  /**
   * ...
   */
  start: function() {
    this.log("starting hand");
    this.players.forEach((player, playerposition) => {
      player.startHand(this, playerposition);
    });
    this.log("starting wall:", this.wall.tiles.slice(0).join(','));
    // perform initial setup:
    this.players.forEach((player, playerposition) => {
      this.initialSetup(player, playerposition);
    });
    // Start the game loop for this hand.
    this.deal();
  },

  /**
   * ...
   */
  initialSetup: function(player, playerposition) {
    // set up protocol listener and emitter, with known security values
    var gameid = this.game.id;
    var handid = this.id;
    var playerid = player.id;

    // set up the protocol listener and emitter for this player
    var securities = { gameid, handid, playerid, playerposition };
    this.mustMatch = Object.keys(securities);
    this.listenFor = new Listener(player.socket, securities);

    // set up protocol handling for actions taken by players while playing a hand.
    this.listenFor.discard(this);
    this.listenFor.claim(this);
    this.listenFor.compensate(this);
    this.listenFor.reveal(this);
    this.listenFor.verify(this);

    // deal a player their initial tiles
    var tiles = this.wall.deal(Constants.HANDSIZE - 1);
    player.setHand(tiles.sort((a,b) => a-b));
    this.log("dealing",tiles.length,"initial tiles to",playerposition);

    // notify the other players that someone was dealt their initial tiles
    this.players.forEach(p => {
      if (p===player) return;
      p.dealtTiles(playerposition, tiles.length);
    });
  },

  /**
   * ...
   */
  deal: function() {
    var tile = this.wall.draw();
    if (tile === Constants.NOTILE) {
      this.log("hand was a draw");
      this.players.forEach(player => {
        player.drawOccured();
      });
      return;
    }

    var cpos = this.currentPlayer;
    this.log("dealing",tile,"to",cpos);
    this.log("tiles left in the wall:", this.wall.playlength());
    this.players[cpos].deal(tile);
    this.players.forEach((player,pos) => {
      if (pos===cpos) return;
      this.log("notifying",pos,"a tile was dealt");
      player.drew(cpos);
    });

    this.log("player",cpos,"tiles:",this.players[cpos].tiles.sort());
  },

  /**
   * ...
   */
  handleDiscard: function(playerposition, tile) {
    // FIXME: TODO: give the player a grace period to take back the discard.
    //              Because we're all human here. Unless it's an AI. Then: too bad.
    this.log("player",playerposition,"discarded",tile);
    this.players[playerposition].discard(tile);
    this.players.forEach((player,pos) => {
      player.discarded(playerposition,tile);
    });

    // We will wait 3 seconds for all claims to come in.
    // If none do, we continue the round.
    var timeout = this.hand_timeout || Constants.HAND_TIMEOUT;
    this.roundTimeout = setTimeout(this.next.bind(this, tile), timeout);
  },

  /**
   * ...
   */
  next: function(discardTile) {
    this.players.forEach(player => player.unclaimed(discardTile));
    var oldplayer = this.currentPlayer;
    this.currentPlayer = (oldplayer + 1) % this.players.length;
    this.log("active player:",oldplayer,"=>",this.currentPlayer);
    this.deal();
  },

  /**
   * ...
   */
  handleClaim: function(playerid, playerposition, tile, claimType, winType) {
    // if someone lays claim, we stop our next-player's-turn timeout
    clearTimeout(this.roundTimeout);
    this.roundTimeout = false;

    // who's claiming this discard, and for what?
    var player = this.players[playerposition];

    // is this a legal claim?
    this.log(playerposition,"("+playerid+"/"+player.id+")","claims discard as", claimType);

    // FIXME: TODO: actually wait for all claims to come in before awarding a claim.
    if (this.ruleset.canClaim(player, tile, claimType, winType)) {
      this.log("player",playerposition,"can claim",tile,"as",claimType,"(wintype:"+winType+")");

      // if this was a winning claim, the hand is over.
      if (claimType === Constants.WIN) {
        this.log("player",playerposition,"("+player.id+")","has won.");
        player.awardWinningClaim(this.ruleset, tile, winType);
        this.players.forEach((player, idx) => {
          player.winOccurred(playerposition, tile, winType);
        });
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

    } else {
      // decline the claim and advance the game.
      player.declineClaim(tile, claimType);
      this.next();
    }
  },

  /**
   * ...
   */
  handleCompensate: function(playerid, playerposition, tiles) {
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

    var player = this.players[playerposition];
    var compensationTiles = this.wall.deal(tiles.length);
    player.getCompensation(tiles, compensationTiles);

    this.players.forEach(p => {
      if (p===player) return;
      p.gotCompensation(playerposition, tiles);
    });
  },

  /**
   * ...
   */
  handleReveal: function(playerposition, set) {
    this.players.forEach((p, pos) => {
      if (pos === playerposition) return;
      p.revealedSet(playerposition, set);
    });
  },

  /**
   * ...
   */
  handleVerify: function(playerposition, digest) {
    this.players[playerposition].verify(digest);
  }

};

module.exports = Hand;
