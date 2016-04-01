var React = require('react');
var Tile = require('../components/Tile.jsx');
var ClaimMenu = require('../components/ClaimMenu.jsx');
var Constants = require('../../../server/lib/constants');
var classnames = require('classnames');
var md5 = require('md5');

// external:
var io = require("io");

var Player = React.createClass({
  statics: {
    OWN_TURN: "in own turn",
    OUT_OF_TURN: "out of turn",
    HAND_OVER: "hand is over"
  },

  log() {
    var msg = Array.from(arguments).join(' ');
    this.setState({
      log: this.state.log.concat([msg])
    });
  },

  getInitialState() {
    return {
      socket: io.connect('http://localhost:8081'),
      playerid: -1,
      gameid: -1,
      tiles: [],
      bonus: [],
      revealed: [],
      log: [],
      mode: Player.OUT_OF_TURN,
      discard: false
    };
  },

  componentWillMount() {
    var socket = this.state.socket;

    socket.on('connected', data => {
      var playerid = data.playerid;
      var gameid = window.location.search.match(/gameid=(\d+)/)[1];
      this.log("joining game", gameid);
      this.setState({ playerid });
      socket.emit("join", {
        playerid: playerid,
        gameid: gameid
      });
    });

    socket.on('joined', data => {
      var gameid = data.gameid;
      this.log("joined game", gameid);
      this.setState({ gameid });
    });

    socket.on('ready', data => {
      var gameid = data.gameid;
      this.log("starting game", gameid);
    });

    socket.on('sethand', data => {
      var tiles = data.tiles;
      tiles.sort((a,b) => a - b);
      this.log("received", tiles.join(','));
      this.setState({ tiles: tiles }, this.filterBonus);
    });

    socket.on('compensation', data => {
      var tiles = data.tiles;
      this.log("received compensation", tiles.join(','));
      tiles = tiles.concat(this.state.tiles);
      tiles.sort((a,b) => a - b);
      this.setState({ tiles: tiles}, this.filterBonus);
    });

    // player received a tile to play with
    socket.on('tile', data => {
      var tile = data.tile;
      var playerid = data.playerid;
      this.log("received tile", tile);
      this.setState({ discard: false });
      this.addTile(tile);
    });

    // another player received a tile to play with
    socket.on('drew', data => {
      this.log("player", data.player, "received tile");
      this.setState({ discard: false });
    });

    // a discard occurred
    socket.on('discard', data => {
      var tile = data.tile;
      this.log("saw discard of tile", tile);
      this.setState({ discard: tile });
    });

    // a claim by this player was declined
    socket.on('declined', data => {
      this.log("claim for", data.tile, "("+data.claimType+")", "was declined");
    });

    // a claim by this player was accepted
    socket.on('accepted', data => {
      var tile = data.tile;
      this.processClaim(data.tile, data.claimType);
    });

    // a claim by another player was accepted
    socket.on('claimed', data => {
      this.setState({
        discard: false
      });
    });

    // wall ran out of tiles, no one won...
    socket.on('finish:draw', data => {
      this.log("hand was a draw...");
      this.setState({ mode: Player.HAND_OVER, discard: false });
    });
  },

  /**
   * Determine which tiles to form a set with.
   */
  processClaim(tile, claimType) {
    // TODO: for now only PUNGs are allowed through
    this.log("claim for", tile, "("+claimType+")", "was accepted");

    // remove tile from hand twice and form set.
    var tiles = this.state.tiles;
    for(var i=0; i<2; i++) {
      tiles.splice(tiles.indexOf(tile),1);
    }
    var set = [tile, tile, tile];
    console.log(tiles, set);
    var revealed = this.state.revealed;
    revealed.push(set);
    this.setState({ tiles, revealed, discard: false, mode: Player.OWN_TURN }, () => {
      var list = this.state.tiles.concat(this.state.bonus);
      this.state.revealed.forEach(set => { list = list.concat(set); });
      list.sort();
      var digest = md5(list.join(''));
      this.log("confirming synchronized state. tiles:",list,"md5:",digest);
      this.state.socket.emit("validate", {
        playerid: this.state.playerid,
        gameid: this.state.gameid,
        digest: digest
      });
    });
  },

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
        <div className="tiles">{ this.formTiles(this.state.tiles, this.state.mode === Player.HAND_OVER) }</div>
        <div className="open">
          <span className="bonus">{ this.formTiles(this.state.bonus, true) }</span>
          <span className="revealed">{ this.showRevealed() }</span>
        </div>
        <div className="log">{ this.state.log.map((msg,pos) => <p key={pos}>{msg}</p>).reverse() }</div>
      </div>
    );
  },

  showDiscard: function() {
    if (this.state.discard === false) {
      return null;
    }
    if (this.state.claimMenu) {
      return <ClaimMenu claim={this.claimDiscard}/>;
    }
    return <Tile value={this.state.discard} onClick={this.claimMenu}/>;
  },

  claimMenu: function() {
    this.setState({ claimMenu: true });
  },

  claimDiscard: function(claimType) {
    this.setState({ claimMenu: false });
    if (claimType !== Constants.NOTILE) {
      this.state.socket.emit("claim", {
        playerid: this.state.playerid,
        tile: this.state.discard,
        claimType: claimType
      });
    }
  },

  filterBonus() {
    var tiles = this.state.tiles;
    var bonus = [];
    for(var i=tiles.length-1; i>=0; i--) {
      if (tiles[i] >= Constants.BONUS) {
        bonus.push(tiles.splice(i,1)[0]);
      }
    }

    if (bonus.length > 0) {
      this.setState({
        tiles: tiles,
        bonus: this.state.bonus.concat(bonus)
      });
      // request compensation tiles for any bonus tile file
      this.log("requesting compensation for", bonus.join(','));
      this.state.socket.emit("compensate", {
        playerid: this.state.playerid,
        tiles: bonus
      });
    }
  },

  showRevealed() {
    var tiles = [];
    this.state.revealed.forEach((set,p1) => {
      console.log('set', set);
      set.forEach((tile,p2) => {
        console.log('tile', tile);
        tiles.push(<Tile key={`${tile}-${p1}-${p2}`} value={tile}/>);
      });
    });
    return tiles;
  },

  formTiles(tiles, inactive) {
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

  addTile(tile) {
    this.log("adding tile", tile);
    var tiles = this.state.tiles;
    tiles.push(tile);
    tiles.sort((a,b) => a - b);
    this.setState({ tiles: tiles, mode: Player.OWN_TURN }, this.filterBonus);
  },

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
    });
    this.state.socket.emit("discard", { tile: tile });
  },

  handleTileSelect(tile) {
    return (evt) => {
      if (this.state.mode === Player.OWN_TURN) {
        this.discardTile(tile);
      } else {
        console.log("do nothing");
      }
    };
  }
});

module.exports = Player;
