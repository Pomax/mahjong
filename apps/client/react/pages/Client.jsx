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
      playerposition: -1
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
        <div className="players">{ this.formPlayers(socket) }</div>
        <div className="handinfo">
          <Discards ref="discards" socket={socket}/>
          <Wall ref="wall" socket={socket} />
        </div>
      </div>
    );
  },

  formPlayers(socket) {
    // generate generic player except for ourselves
    var players = [0,1,2,3].map(pos => {
      if (pos === this.state.playerposition) return null;
      return <OtherPlayer ref={"player"+pos} name={this.state.playerNames[pos]} label={Player.windKanji[pos]} socket={socket} key={pos} playerposition={pos} />;
    });
    // and then insert "us" into that set based on our play position
    players.splice(
      this.state.playerposition,
      1,
      <Player key="player" settings={this.state.settings} socket={socket} playerid={this.state.playerid} gameid={this.state.gameid} onNextHand={this.nextHand}/>
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

  readyGame(data) {
    this.setState({ viewLobby: false, playerNames: data.players }, () => {
      this.state.socket.emit("readygame", data);
    });
  }

});

module.exports = Client;