var React = require('react');

var Lobby = require('../components/Lobby.jsx');
var Wall = require('../components/Wall.jsx');
var Discards = require('../components/Discards.jsx');
var Player = require('../components/Player.jsx');
var OtherPlayer = require('../components/OtherPlayer.jsx');

var Settings = require('../../lib/playersettings');

// externally loaded:
var io = require('io');

var Client = React.createClass({

  getInitialState() {
    /**
     * Initial socket connection
     */
    var loc = window.location;
    var url = loc.protocol + "//" + loc.hostname + (loc.port? ':'+loc.port : '');
    var socket = io.connect(url);

    var search = window.location.search;
    var params = {};
    search.replace('?','').split('&').forEach(t => {
      let v = t.split('=');
      params[v[0]] = v[1];
    });

    return {
      socket: socket,
      settings: new Settings(params.localStorageId),
      viewLobby: true,
      playerNames: [],
      gameid: -1,
      playerid: -1,
      handid: -1,
      playerposition: -1,
      currentPlayer: -1
    };
  },

  componentWillMount() {
    this.state.socket.on('confirm', data => {
      var gameid = data.gameid;
      var handid = data.handid;
      var playerid = data.playerposition;
      var playerposition = data.playerposition;
      this.setState({ gameid, handid, playerid, playerposition });
    });

    this.state.socket.on("drew", data => {
      this.setState({ currentPlayer: this.state.playerposition });
    });

    this.state.socket.on("tile", data => {
      var playerposition = data.playerposition;
      this.setState({ currentPlayer: playerposition });
    });
  },

  componentWillUnmount() {
    this.state.socket.disconnect();
  },

  render() {
    var socket = this.state.socket;
    if (this.state.viewLobby) {
      return <Lobby settings={this.state.settings} socket={socket} readyGame={this.readyGame}/>;
    }
    return (
      <div className="client">
        { this.formPlayers(socket) }
        <Discards ref="discards" socket={socket}/>
        <Wall ref="wall" socket={socket} />
      </div>
    );
  },

  formPlayers(socket) {
    // generate generic player except for ourselves
    var players = [0,1,2,3].map(pos => {
      if (pos === this.state.playerposition) return null;
      var active = (pos === this.state.currentPlayer);
      return <OtherPlayer ref={"player"+pos} active={active} playerposition={pos} name={this.state.playerNames[pos]} wind={Player.windKanji[pos]} socket={socket} key={pos} />;
    });
    // and then insert "us" into that set based on our play position
    players.splice(
      this.state.playerposition,
      1,
      <Player key="player" settings={this.state.settings} socket={socket} playerid={this.state.playerid} gameid={this.state.gameid} ruleset={this.state.ruleset} onNextHand={this.nextHand}/>
    );
    return players;
  },

  nextHand() {
    this.refs.discards.reset();
    this.refs.wall.reset();
    for(var i=0; i<4; i++) {
      var player = this.refs['player'+i];
      if (player) {
        player.reset();
      }
    }
  },

  readyGame(data, ruleset) {
    this.setState({ viewLobby: false, playerNames: data.players, ruleset }, () => {
      this.state.socket.emit("readygame", data);
    });
  }

});

module.exports = Client;