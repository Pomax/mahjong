var io = require('socket.io-client');
var md5 = require('md5');

var PlayConstants = require('../../lib/constants');
var logger = require('../../../../lib/logger');
var Tiles = require('../../../../lib/game/tiles');
var Constants = require('../../../../lib/game/constants');
var socketbindings = require('../../lib/socketbindings');

// The base state of a player when a hand is played.
var baseState = {
  // game data
  gameid: -1,
  playerposition: -1,
  mode: PlayConstants.OUT_OF_TURN,
  balance: '',
  // hand information
  dealtTile: -1,
  tiles: [],
  kongs: [],
  bonus: [],
  revealed: [],
  // discard information
  discard: false,
  discardPlayer: -1,
  // hand-end information
  winner: false,
  winTile: false,
  winType: false
};

var AIPlayer = function(botNameID, server, gameid, AI) {
  var botName = "AI player " + botNameID;
  this.log = logger(botName);
  this.log("start up bot");

  this.log("bootstrapping AI player state");
  this.state = {};

  var state = Object.assign({
    socket: io.connect(server),
    gameid: gameid,
    handid: -1,
    playerid: -1,
    playername: botName,
    score: 0
  }, baseState);

  this.setState(state, () => {
    this.log("state bound, binding socket for listening");
    socketbindings.bind(this.state.socket, this, () => {
      // Make sure we can respond to the "ready for game" call,
      // which is normally handled through the client/lobby,
      // which AI players (obviously) do not participate in.
      this.state.socket.on("readygame", data => {
        this.log("readygame received, acknowledging...");
        this.state.socket.emit("readygame", data);
      });
      // And then join the game we were built to join.
      this.log("joining game",gameid);
      this.joinGame(gameid);
    });

    this.log("bootstrapping ruleset-specific AI backing");
    this.ai = new AI(this);
  });
};

AIPlayer.prototype = {
  setState(props, finishedSettingState) {
    Object.keys(props).forEach(key => this.state[key] = props[key]);
    if (finishedSettingState) {
      finishedSettingState = finishedSettingState.bind(this);
      setTimeout(finishedSettingState, 1);
    }
  },

  log() {
    var msg = Array.from(arguments).join(' ');
    console.log(msg);
  },

  send(evt, payload) {
    payload = payload || {};
    payload.gameid = this.state.gameid;
    payload.handid = this.state.handid;
    payload.playerid = this.state.playerid;
    payload.playerposition = this.state.playerposition;
    this.state.socket.emit(evt, payload);
  },

  resetState(done) {
    this.setState(baseState, done);
  },

  joinGame(gameid) {
    this.state.socket.emit("joingame", {
      gameid,
      playername: this.state.playername
    });
  },

  joinedGame(gameid) {
    this.setState({ gameid });
  },

  makeReady(gameid, handid, playerid, playerposition, score) {
    var state = { gameid, handid, playerid, playerposition, score, balance:'' };
    this.setState(state, () => {
      this.send("confirmed", state);
    });
  },

  isWinner() {
    return (this.state.mode === PlayConstants.HAND_OVER) && (this.state.winner === this.state.playerposition);
  },

  isLoser() {
    return (this.state.mode === PlayConstants.HAND_OVER) && (this.state.winner !== this.state.playerposition);
  },

  isDraw() {
    return (this.state.mode === PlayConstants.HAND_OVER) && (this.state.winner === -1);
  },

  // make the playe reset in preparation for the next hand.
  restartReady() {
    this.resetState(() => {
      this.send("restartready", {ready: true});
      this.props.onNextHand();
    });
  },

  /**
   * Add a tile to this player's bank of tiles
   */
  setInitialTiles(tiles) {
    this.log("setting tiles", tiles);
    this.setState({ tiles: tiles }, this.filterForBonus);
  },

  /**
   * Add a tile to this player's bank of tiles
   */
  addCompensationTiles(compensation) {
    var tiles = this.state.tiles;
    tiles = tiles.concat(compensation);
    tiles.sort((a,b) => a - b);
    this.setState({
      dealtTile: compensation[0],
      tiles: tiles
    }, this.filterForBonus);
  },

  /**
   * Add a tile to this player's bank of tiles
   */
  addTile(tile) {
    this.log("adding tile", tile);
    var tiles = this.state.tiles;
    tiles.push(tile);
    tiles.sort((a,b) => a - b);
    this.setState({
      dealtTile: tile,
      tiles: tiles,
      mode: PlayConstants.OWN_TURN,
      discard: false
    }, this.filterForBonus);
  },

  otherPlayerDrew() {
    this.setState({
      discard: false,
      mode: PlayConstants.OUT_OF_TURN
    });
  },

  otherPlayerDiscarded(discard, discardPlayer) {
    this.setState({ discard, discardPlayer }, () => {
      var claim = this.ai.determineClaim(discard, discardPlayer);
      if (claim.tile !== Constants.NOTILE) {
        this.claimDiscard(claim.claimType, claim.winType);
      }
    });
  },

  otherPlayerClaimed(playerposition, tile, claimType) {
    this.setState({ discard: false });
  },


  /**
   * When a player is dealt a tile, filter out any bonus tiles and make
   * sure to ask the game for one or more compensation tiles.
   */
  filterForBonus() {
    var bonus = [];
    var tiles = this.state.tiles;

    // move bonus tiles out of the player's hand.
    for(var i=tiles.length-1; i>=0; i--) {
      if (tiles[i] >= Constants.BONUS) {
        bonus.push(tiles.splice(i,1)[0]);
      }
    }

    // no bonus tiles left to process: we can now "play"
    if (bonus.length === 0) {
      // But first we must check whether this stable tile configuration
      // affords the player to declare any kongs-in-hand, because they
      // might want to declare those to get more compensation tiles.
      return this.checkKong(tiles);
    }

    // We had bonus tiles to move out of our hand, so move
    // them, and then request compensation tiles for those.
    this.setState({
      tiles: tiles,
      bonus: this.state.bonus.concat(bonus)
    }, () => {
      // request compensation tiles for any bonus tile found.
      this.log("requesting compensation for", bonus.join(','));
      this.send("compensate", { tiles: bonus });
    });
  },

  // check if this player has any concealed kongs in their hand
  checkKong(tiles) {
    this.log("checking for kongs-in-hand");
    var counter = {};
    tiles.forEach(t => counter[t] = (counter[t]||0) + 1);
    var kongs = Object.keys(counter).filter(c => counter[c]===4);

    // checkKong is the last call in all tile reception chains,
    // so we ask the AI component to perform a play here:
    this.setState({ kongs }, this.determinePlay);
  },

  // Let the AI determine how to play for this client.
  determinePlay() {
    this.log("updating strategy");
    this.ai.updateStrategy();
    if (this.state.mode === PlayConstants.OWN_TURN) {
      this.log("determining what to discard");
      var tile = this.ai.determineDiscard();
      if (tile === Constants.NOTILE) {
        this.log("we're not discarding, so we must have won.");
      } else {
        // We do this on a timeout to make it *look* like the AI
        // needed  some time to think about what to do.
        setTimeout(() => this.discardTile(tile), 400);
      }
    }
  },

  // Called by the button to claim a concealed kong. Sends a
  // request to the server to see if they can perform this
  // claim. If they can, the response is an acceptance plus
  // bonus tile that the player needs.
  claimConcealedKong(tile) {
    return (evt) => {
      this.log("requesting concealed kong for "+tile);
      this.send("claim:concealedkong", { tile });
    };
  },

  allowKongDeclaration(tile, compensation) {
    if (compensation) {

      // FIXME: TODO: overlap with processClaim, refactor to single function.
      var tiles = this.state.tiles;

      var set = [tile, tile, tile, tile];
      set.forEach(tile => {
        var pos = tiles.indexOf(tile);
        tiles.splice(pos,1);
      });

      var revealed = this.state.revealed;
      revealed.push(set);

      this.setState({ tiles, revealed }, () => {
        this.addTile(compensation);
      });

      // notify server of our reveal
      this.send("reveal", { set:set, concealed: true });

    } else {
      this.log("not allowed to claim concealed kong for " + tile);
    }
  },

  /**
   * Player discards a tile from their set of playable tiles.
   */
  discardTile(tile) {
    this.log("discarding tile", tile);
    var tiles = this.state.tiles;
    var pos = tiles.indexOf(tile);
    if (pos === -1) {
      // that's an error
      console.error(`player is trying to discard a tile (${tile}) they do not have...`);
    }
    tiles.splice(pos,1);
    this.setState({
      dealtTile: -1,
      tiles,
      mode: PlayConstants.OUT_OF_TURN
    }, () => {
      this.send("discard", {
        tile: tile
      });
    });
  },

  /**
   * Inform the game that this player wants to claim the currently available discard.
   */
  claimDiscard(claimType, winType) {
    this.setState({ claimMenu: false }, () => {
      if (claimType !== Constants.NOTILE) {
        this.send("claim", {
          tile: this.state.discard,
          claimType: claimType,
          winType: winType
        });
      }
    });
  },

  /**
   * Determine which tiles to form a set with.
   */
  processClaim(tile, claimType, winType) {
    this.log("claim for", tile, "("+claimType+")", "was accepted");

    // remove tile from hand twice and form set.
    var set = [];
    if (claimType === Constants.WIN && winType === Constants.PAIR) { set = this.formSet(tile,2); }
    if (claimType <= Constants.CHOW3) { set = this.formChow(tile, claimType); }
    if (claimType === Constants.PUNG) { set = this.formSet(tile, 3); }
    if (claimType === Constants.KONG) { set = this.formSet(tile, 4); }
    this.log("set:", set);

    var tiles = this.state.tiles;
    tiles.push(tile);
    set.forEach(tile => {
      var pos = tiles.indexOf(tile);
      tiles.splice(pos,1);
    });

    var revealed = this.state.revealed;
    revealed.push(set);

    this.setState({
      tiles,
      revealed,
      discard: false,
      mode: PlayConstants.OWN_TURN
    }, () => {
      this.verify();
      this.determinePlay();
    });

    // notify server of our reveal
    this.send("reveal", { set: set });
  },

  // utility function
  formChow(tile, chowtype) {
    if (chowtype === Constants.CHOW1) return [tile, tile+1, tile+2];
    if (chowtype === Constants.CHOW2) return [tile-1, tile, tile+1];
    if (chowtype === Constants.CHOW3) return [tile-2, tile-1, tile];
  },

  // utility function
  formSet(tile, howmany) {
    var set = [];
    while(howmany--) { set.push(tile); }
    return set;
  },

  /**
   * Generate a hash based on this player's tiles, bonus tiles, and revealed tiles.
   */
  getDigest() {
    var list = this.state.tiles.concat(this.state.bonus);
    this.state.revealed.forEach(set => { list = list.concat(set); });
    var todigest = list.sort((a,b) => parseInt(a) - parseInt(b)).join(",");
    var digest = md5(todigest);
    this.log("digest information for tiles:",todigest," - md5:",digest);
    return digest;
  },

  /**
   * Ask the server to verify our tile state.
   */
  verify() {
    this.log("verifying",this.state.playerposition,":",this.state.tiles,this.state.bonus,this.state.revealed);
    this.send("verify", {
      tiles: this.state.tiles,
      bonus: this.state.bonus,
      revealed: this.state.revealed,
      digest: this.getDigest()
    });
  },

  /**
   * If we did not pass verification, we need to inspect the game logs immediately.
   */
  verification(result) {
    this.log("verification:",result);
  },

  /**
   * Hand ended, ending in a draw.
   */
  finishDraw() {
    this.finish(-1, Constants.NOTILE, Constants.NOTHING);
  },

  /**
   * Hand ended, ending in a win by one of the players.
   */
  finishWin(playerposition, tile, winType) {
    this.finish(playerposition, tile, winType);
  },

  /**
   * Hand ended.
   * pid = -1 => draw
   * pid > -1 => winning player
   */
  finish(playerposition, tile, winType) {
    this.setState({
      mode: PlayConstants.HAND_OVER,
      discard: false,
      winner: playerposition,
      winTile: tile,
      winType: winType
    });
  },

  /**
   * Score was updated based on a hand being won by someone.
   */
  updateScore(score, balance) {
    this.setState({ score, balance });
  }
};

AIPlayer.nextId = (function() {
  var id = 0;
  return () => ++id;
}());

module.exports = AIPlayer;