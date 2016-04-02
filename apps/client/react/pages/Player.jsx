var React = require('react');
var Tile = require('../components/Tile.jsx');
var ClaimMenu = require('../components/ClaimMenu.jsx');
var Constants = require('../../../server/lib/constants');
var classnames = require('classnames');
var socketbindings = require('../../lib/socketbindings');
var md5 = require('md5');

// externally loaded:
var io = require('io');

var Player = React.createClass({
  statics: {
    OWN_TURN: "in own turn",
    OUT_OF_TURN: "out of turn",
    HAND_OVER: "hand is over"
  },

  log() {
    var msg = Array.from(arguments).join(' ');
    this.setState({ log: this.state.log.concat([msg]) });
  },

  getInitialState() {
    return {
      socket: io.connect('http://localhost:8081'),
      // game data
      playerid: -1,
      gameid: -1,
      playerposition: -1,
      handid: -1,
      mode: Player.OUT_OF_TURN,
      // hand information
      tiles: [],
      bonus: [],
      revealed: [],
      // discard information
      discard: false,
      discardPlayer: -1,
      // play log for this player
      log: []
    };
  },

  componentWillMount() {
    var socket = this.state.socket;
    socketbindings.bind(socket, this);
  },

  /**
   * Render the player UI
   */
  render() {
    var classes = classnames("player", {
      active: this.state.mode === Player.OWN_TURN
    });

    var dclasses = classnames("discard", {
      menu: this.state.claimMenu
    });

    return (
      <div className={classes}>
        <div className={dclasses}>{ this.showDiscard() }</div>
        <div className="tiles">{ this.renderTiles(this.state.tiles, this.state.mode === Player.HAND_OVER) }</div>
        <div className="open">
          <span className="bonus">{ this.renderTiles(this.state.bonus, true) }</span>
          <span className="revealed">{ this.renderRevealed() }</span>
        </div>
        <div className="log">{ this.state.log.map((msg,pos) => <p key={pos}>{msg}</p>).reverse() }</div>
      </div>
    );
  },

  /**
   * Show the currently available discard
   */
  showDiscard() {
    if (this.state.discard === false) {
      return null;
    }
    if (this.state.claimMenu) {
      var chowPos = (this.state.discardPlayer+1) % 4;
      var mayChow = (chowPos === this.state.playerposition);
      return <ClaimMenu claim={this.claimDiscard} mayChow={mayChow}/>;
    }
    return <Tile value={this.state.discard} onClick={this.claimMenu}/>;
  },

  /**
   * Render the "open" tiles for this player
   */
  renderRevealed() {
    var tiles = [];
    this.state.revealed.forEach((set,p1) => {
      set.forEach((tile,p2) => {
        tiles.push(<Tile key={`${tile}-${p1}-${p2}`} value={tile}/>);
      });
    });
    return tiles;
  },

  /**
   * Render the in-hand tiles for this player
   */
  renderTiles(tiles, inactive) {
    if (tiles.length === 0) {
      return null;
    }
    tiles.sort((a,b) => a-b);
    return tiles.map((tile,pos) => {
      var key = tile + '-' + pos;
      var onclick = inactive ? null : this.handleTileSelect(tile);
      return <Tile key={key} value={tile} onClick={onclick}/>;
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
    this.setState({ tiles: tiles }, this.filterForBonus);
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
      tiles: tiles,
      mode: Player.OWN_TURN,
      discard: false
    }, this.filterForBonus);
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

    if (bonus.length > 0) {
      this.setState({
        tiles: tiles,
        bonus: this.state.bonus.concat(bonus)
      }, () => {
        // request compensation tiles for any bonus tile found.
        this.log("requesting compensation for", bonus.join(','));
        this.state.socket.emit("compensate", {
          playerid: this.state.playerid,
          tiles: bonus
        });
      });
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
   * Player discardss a tile from their set of playable tiles.
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
      tiles,
      mode: Player.OUT_OF_TURN
    }, () => {
      this.state.socket.emit("discard", { tile: tile });
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
        this.state.socket.emit("claim", {
          playerid: this.state.playerid,
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
  processClaim(tile, claimType) {
    this.log("claim for", tile, "("+claimType+")", "was accepted");

    // remove tile from hand twice and form set.
    // FIXME: TODO: synchronize this with server/lib/game/player.js
    var set = [];
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
    }, this.verify);
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
    list.sort();
    var digest = md5(list.join(''));
    this.log("confirming synchronized state. tiles:",list,"md5:",digest);
    return digest;
  },

  /**
   * Ask the server to verify our tile state.
   */
  verify() {
    this.state.socket.emit("verify", {
      playerid: this.state.playerid,
      gameid: this.state.gameid,
      handid: this.state.handid,
      digest: this.getDigest(),
      tiles: this.state.tiles,
      bonus: this.state.bonus,
      revealed: this.state.revealed
    });
  }
});

module.exports = Player;
