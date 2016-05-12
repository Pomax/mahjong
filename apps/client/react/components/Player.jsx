/**
 * TODO:
 *
 * - allow the user to claim that they have won
 * - allow a user to declare a self-drawn kong
 *
 */

var React = require('react');
var classnames = require('classnames');
var md5 = require('md5');

var Constants = require('../../../../lib/game/constants');
var rulesets = require('../../../../lib/game/rulesets');
var Tiles = require('../../../../lib/game/tiles');

var socketbindings = require('../../lib/socketbindings');

var Tile = require('../components/Tile.jsx');
var ClaimMenu = require('../components/ClaimMenu.jsx');
var Overlay = require('../components/Overlay.jsx');

// the static properties we want the Player class to have.
var statics = require('../../lib/constants');

// The base state of a player when a hand is played.
var baseState = {
  // game data
  gameid: -1,
  playerposition: -1,
  mode: statics.OUT_OF_TURN,
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

var Player = React.createClass({
  statics: statics,

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

  getInitialState() {
    var useAI = (typeof window !== "undefined") ? (window.location.search.indexOf('useAI=true')!==-1) : false;

    return Object.assign({
      socket: this.props.socket,
      // game data
      gameid: -1,
      handid: -1,
      playerid: -1,
      ruleset: this.props.ruleset,
      score: 0,
      useAI: useAI
    }, baseState);
  },

  resetState(done) {
    this.setState(baseState, done);
  },

  componentDidMount() {
    var socket = this.state.socket;
    socketbindings.bind(socket, this);
  },

  joinedGame(gameid) {
    this.setState({ gameid });
  },

  makeReady(gameid, handid, playerid, playerposition, score) {
    var ruleset = new rulesets[this.props.ruleset]();
    var AI = ruleset.getAI();
    var ai = new AI(this);
    var state = { gameid, handid, playerid, playerposition, score, balance:'', ai };

    this.setState(state, () => {
      this.send("confirmed", state);
    });
  },

  isWinner() {
    return (this.state.mode === Player.HAND_OVER) && (this.state.winner === this.state.playerposition);
  },

  isLoser() {
    return (this.state.mode === Player.HAND_OVER) && (this.state.winner !== this.state.playerposition);
  },

  isDraw() {
    return (this.state.mode === Player.HAND_OVER) && (this.state.winner === -1);
  },

  /**
   * Render the player UI
   */
  render() {
    var winner = this.isWinner(),
        loser = this.isLoser(),
        draw = this.isDraw();

    var classes = classnames(
      "player",
      {
        active: this.state.mode === Player.OWN_TURN,
        winner: winner,
        loser: loser,
        draw: draw
      }
    );

    var dclasses = classnames(
      "discard",
      Player.winds[this.state.playerposition],
      {
        menu: this.state.claimMenu
      }
    );

    return (
      <div className="double row">
        { this.formOverlay(winner, loser, draw) }
        <div className={classes}>

          <div className="metadata">
            <div className="kongs-and-scores">
              <span className="kongs">
              {
                this.state.mode === Player.OWN_TURN ?
                  this.state.kongs.map(k => <button key={k} onClick={this.claimConcealedKong(k)}>{Tiles.getTileName(k)}</button>)
                  : null
              }
              </span>
              <span className="score">
                score: { this.state.score } {
                  this.props.settings.name ? "(" + this.props.settings.name + ")" : null
                }
              </span>
            </div>

            <div className={dclasses} onClick={this.discardClicked}>
            { this.renderDiscard() }
            </div>
          </div>

          <div className="row tiles">{ this.renderTiles(this.state.tiles, this.state.mode === Player.HAND_OVER, this.state.dealtTile) }</div>
          <div className="row open">
            <span className="bonus">{ this.renderTiles(this.state.bonus, true) }</span>
            <span className="revealed">{ this.renderRevealed() }</span>
          </div>
        </div>
      </div>
    );
  },

  formOverlay(winner, loser, draw) {
    if (this.state.mode !== Player.HAND_OVER || this.state.useAI) {
      return null;
    }
    var content = '';
    if (draw) { content = "The hand was a draw..."; }
    else if (winner) { content = "You won the hand!"; }
    else if (loser) { content = "Player "+this.state.winner+" won the hand."; }
    return (
      <Overlay>
        {content}
        <pre>
          {JSON.stringify(this.state.balance,false,2)}
        </pre>
      </Overlay>
    );
  },

  /**
   * Show the currently available discard
   */
  renderDiscard() {
    if (this.state.discard === false) {
      if (this.state.winner !== false) {
        return <button onClick={this.restartReady}>Ready</button>;
      }
      return null;
    }
    if (this.state.claimMenu) {
      var chowPos = (this.state.discardPlayer+1) % 4;
      var mayChow = (chowPos === this.state.playerposition);
      return <ClaimMenu claim={this.claimDiscard} mayChow={mayChow}/>;
    }
    var ownDiscard = this.state.discardPlayer === this.state.playerposition;
    var onClick = ownDiscard ? null : this.claimMenu;
    var title = ownDiscard ? "your discard" : "discard tile "+Tiles.getTileName(this.state.discard)+", click to claim it!";
    return <Tile value={this.state.discard} ownDiscard={ownDiscard} onClick={onClick} title={title} />;
  },

  /**
   * Render the "open" tiles for this player
   */
  renderRevealed() {
    var tiles = [];
    this.state.revealed.forEach((set,p1) => {
      set.forEach((tile,p2) => {
        tiles.push(<Tile key={`${tile}-${p1}-${p2}`} value={tile} title={"revealed tile "+Tiles.getTileName(tile)}/>);
      });
    });
    return tiles;
  },

  /**
   * Render the in-hand tiles for this player
   */
  renderTiles(tiles, inactive, tileHighlight) {
    if (tiles.length === 0) {
      return null;
    }
    tiles.sort((a,b) => a-b);
    return tiles.map((tile,pos) => {
      var key = tile + '-' + pos;
      var onclick = inactive ? null : this.handleTileSelect(tile);

      var highlight = false;
      if (tile === tileHighlight && this.state.mode === Player.OWN_TURN) {
        highlight = true;
        tileHighlight = -1;
      }
      var ourTurn = (this.state.mode === Player.OWN_TURN);
      var title = Tiles.getTileName(tile) + " (" + tile + ")" + (ourTurn && !inactive ? ", click to discard" : '');
      return <Tile highlight={highlight} key={key} value={tile} onClick={onclick} title={title}/>;
    });
  },


  // ==========================================================================================


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
      mode: Player.OWN_TURN,
      discard: false
    }, this.filterForBonus);
  },

  // Let the AI determine how to play for this client.
  determinePlay() {
    this.state.ai.updateStrategy();

    // If this is our turn, we should also decide whether we've
    // won, and if not, which tile to discard.
    if (this.state.mode === Player.OWN_TURN) {
      // If we have any concealed kongs, we declare those,
      // because the compensation tile might let us win.
      if (this.state.kongs.length > 0) {
        return this.claimConcealedKong(this.state.kongs[0]);
      }

      // If we don't, let's figure out what to discard. This function
      // will return Constants.NOTILE if we've won, because if we've
      // won we don't want to discard anything.

//      this.log("determining what to discard");
      var tile = this.state.ai.determineDiscard();

      // Did we win?
      if (tile === Constants.NOTILE) {
//        this.log("we're not discarding, so we must have won.");
//        this.log(this.state.tiles, this.state.revealed, this.state.bonus);
      }

      // We did not win, discard the tile we determined was the best discard.
      else { this.discardTile(tile); }
    }
  },

  otherPlayerDrew() {
    this.setState({
      discard: false,
      mode: Player.OUT_OF_TURN
    });
  },

  otherPlayerDiscarded(discard, discardPlayer) {
    this.setState({ discard, discardPlayer });

    // let AI handle this?
    if (this.state.useAI) {
      var claim = this.state.ai.determineClaim(discard, discardPlayer);
      if (claim.tile !== Constants.NOTILE) {
        this.claimDiscard(claim.claimType, claim.winType);
      }
    }
  },

  otherPlayerClaimed(playerposition, tile, claimType) {
    this.setState({
      discard: false
    });
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
    var counter = {};
    tiles.forEach(t => counter[t] = (counter[t]||0) + 1);
    var kongs = Object.keys(counter).filter(c => counter[c]===4);
    this.setState({ kongs }, () => {
      if (this.state.useAI) {
        this.determinePlay();
      }
    });
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
      this.send("reveal", { set, concealed: true });

    } else {
      this.log("not allowed to claim concealed kong for " + tile);
    }
  },

  /**
   * Click-handler for tiles.
   */
  handleTileSelect(tile) {
    return (evt) => {
      if (this.state.mode === Player.OWN_TURN) {
        // players can discard any tile from their playable tile
        // set during their own turn, but not at any other time.
        this.discardTile(tile);
      }
      // Clicking on tiles at any other point in time does nothing.
    };
  },

  /**
   * Player discards a tile from their set of playable tiles.
   */
  discardTile(tile) {
    console.trace();

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
      mode: Player.OUT_OF_TURN
    }, () => {
      this.send("discard", {
        tile: tile
      });
    });
  },

  /**
   * Toggle the internal flag that renders the claim menu rather than
   * the currently available discard tile.
   */
  claimMenu() {
    this.setState({ claimMenu: true });
    // Should this interrupt the play? It feels like it shouldn't,
    // as that would give players a way to take more time than is
    // allotted for a decision.
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
    // FIXME: TODO: synchronize this with server/lib/game/player.js
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
      mode: Player.OWN_TURN
    }, () => {
      this.verify();
      if (this.state.useAI) {
        this.determinePlay();
      }
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
    if (result === false) {
      alert("player "+this.state.playerposition+" failed hand verification!");
    }
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
      mode: Player.HAND_OVER,
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
  },

  /**
   * Clicking the discard instead of discard, on your own turn,
   * will ask you whether you want to claim that you have just won.
   */
  discardClicked(evt) {
    if (this.state.mode === Player.OWN_TURN) {
      var win = confirm("Would you like to declare a win?");
      if (win) {
        win = confirm("Are you sure? You may be penalized for an invalid declaration...");
        if (win) {
          this.send("declare:win");
        }
      }
    }
  }
});

module.exports = Player;
