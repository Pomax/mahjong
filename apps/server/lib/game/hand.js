var logger = require('../logger');
var Constants = require('../constants');
var Player = require('./player');
var Wall = require('./wall');

var Hand = function(game, handid, players, east) {
  east = east || 0;
  this.id = handid;
  this.game = game;
  this.players = players;
  this.wall = new Wall();
  this.currentPlayer = east;
  this.log = logger('game', game.id, 'hand', handid);
};

Hand.prototype = {
  start: function() {
    this.log("starting hand");
    this.players.forEach(player => player.startHand(this));

    this.log("starting wall:", this.wall.tiles.slice(0).join(','));

    this.log("dealing initial tiles");
    this.players.forEach(player => {
      // set up protocol handlers for actions taken by players
      player.socket.on("discard", this.handleDiscard.bind(this));
      player.socket.on("claim", this.handleClaim.bind(this));
      player.socket.on("compensate", this.compensateTiles.bind(this));

      // deal tiles
      var tiles = this.wall.deal(Constants.HANDSIZE - 1);
      player.setHand(tiles.sort((a,b) => a-b));
    });

    this.log("wall after deal:", this.wall.tiles.slice(0).join(','));

    // give east their 14th tile, and take the game from there:
    // 1     - player either declares win or discards a tile
    // 1a    - win declared, goto:win
    // 1b    - discard performed, goto:2
    // 2     - players may claim the discard
    // 3a    - discard is awared to some player, goto:1
    // 3b    - no claims means the next player is dealt a tile, goto:1
    // win   - this hand is over.
    this.deal();
  },


  next: function() {
    var oldplayer = this.currentPlayer;
    this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
    this.log("active player:",oldplayer,"=>",this.currentPlayer);
    this.deal();
  },

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

  handleDiscard: function(data) {
    // FIXME: TODO: give the player a grace period to take back the discard.
    //              Because we're all human here. Unless it's an AI. Then: too bad.
    var tile = data.tile;
    var cpos = this.currentPlayer;
    this.log("player",cpos,"discarded",tile);
    this.players[cpos].discard(tile);
    this.players.forEach((player,pos) => {
      if (pos !== cpos) {
        player.discarded(cpos,tile);
      }
    });

    // We will wait 3 seconds for all claims to come in.
    // If none do, we continue the round.
    this.roundTimeout = setTimeout(this.next.bind(this), this.hand_timeout || Constants.HAND_TIMEOUT);
  },

  handleClaim: function(data) {
    // if someone lays claim, we stop our next-player's-turn timeout
    clearTimeout(this.roundTimeout);
    this.roundTimeout = false;

    // who's claiming this discard, and for what?
    var playerid = data.playerid;
    var player = this.findPlayer(playerid);
    var pos = this.players.indexOf(player);
    var tile = data.tile;
    var claimType = data.claimType;
    var winType = data.winType;

    // is this a legal claim?
    this.log(pos,"("+playerid+"/"+player.id+")","claims discard as", claimType);

    // FIXME: TODO: actually wait for all claims to come in before awarding a claim.
    if (player.canClaim(tile, claimType, winType)) {
      this.log("player",pos,"can claim",tile,"as",claimType,"(wintype:"+winType+")");
      // accept the claim: it is now that player's turn to discard
      player.acceptClaim(tile, claimType, winType);

      // notify players of claim, if it wasn't a winning claim
      if (claimType !== Constants.WIN) {
        this.players.forEach((player, idx) => {
          if (idx===pos) return;
          player.claimOccurred(pos, tile, claimType);
        })
        this.currentPlayer = pos;
      }

      // if this was a winning claim, the hand is over.
      else {
        this.players.forEach((player, idx) => {
          player.winOccurred(pos, tile);
        });
      }

    } else {
      // decline the claim and advance the game.
      player.declineClaim(tile, claimType);
      this.next();
    }
  },

  findPlayer: function(playerid) {
    var filtered = this.players.filter(player => {
      return (player.id === playerid)
    });
    return filtered[0];
  },

  compensateTiles: function(data) {
    // FIXME: TODO: this should probably be handled in the player object?
    var playerid = data.playerid;
    var player = this.findPlayer(playerid);
    var tiles = data.tiles;
    var fair = true;
    for(var i=0; i<tiles.length; i++) {
      if (tiles[i] < Constants.BONUS) {
        fair = false;
        break;
      }
      // FIXME: TODO: also verify this is the right player...
    }

    if (!fair) {
      return this.log("ERROR", "player requested a compensation tile for tile", tile);
    }

    var compensationTiles = this.wall.deal(tiles.length);
    player.getCompensation(compensationTiles);

    var pos = this.players.indexOf(player);
    this.players.forEach(p => {
      if (p===player) return;
      p.gotCompensation(pos, tiles);
    });

    // FIXME: TODO: notify other players of bonus tiles being revealed
  }
};

module.exports = Hand;
