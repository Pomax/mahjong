var React = require('react');

var Lobby = require('../components/Lobby.jsx');
var Wall = require('../components/Wall.jsx');
var Discards = require('../components/Discards.jsx');
var Player = require('../components/Player.jsx');
var OtherPlayer = require('../components/OtherPlayer.jsx');


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

    return {
      socket: socket,
      viewLobby: true,
      gameid: -1,
      playerid: -1,
      handid: -1,
      playerposition: -1
    };
  },

  componentWillMount: function() {
    this.state.socket.on('confirm', data => {
      var gameid = data.gameid;
      var handid = data.handid;
      var playerid = data.playerposition;
      var playerposition = data.playerposition;
      this.setState({ gameid, handid, playerid, playerposition });
    });
  },

  render() {
    var socket = this.state.socket;
    if (this.state.viewLobby) { return this.renderLobby(socket); }

    var others = <div>Waiting for other players to join the game...</div>;
    var handinfo = null;

    if (this.state.playerposition>-1) {
      others = [0,1,2,3].map(pos => {
        if (pos === this.state.playerposition) return null;
        return <OtherPlayer label={Player.windKanji[pos]} socket={socket} key={pos} playerposition={pos} />;
      });
      handinfo = (
        <div className="handinfo">
          <Discards socket={socket} />
          <Wall socket={socket} />
        </div>
      );
    }

    return (
      <div>
        <Player socket={socket} playerid={this.state.playerid} gameid={this.state.gameid}/>
        <div className="others">{ others }</div>
        { handinfo }
      </div>
    );
  },

  renderLobby(socket) {
    return <Lobby socket={socket} joinGame={this.joinGame} onFinish={this.leaveLobby}/>;
  },

  joinGame(gameid, playerid) {
    this.setState({ gameid, playerid, viewLobby: false });
  }

});

module.exports = Client;