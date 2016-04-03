var React = require('react');

var Wall = require('../Components/Wall.jsx');
var Discards = require('../Components/Discards.jsx');
var Player = require('../Components/Player.jsx');
var OtherPlayer = require('../Components/OtherPlayer.jsx');

// externally loaded:
var io = require('io');

var Client = React.createClass({

  getInitialState() {
    return {
      socket: io.connect('http://localhost:8081'),
      gameid: -1,
      handid: -1,
      playerposition: -1
    };
  },

  componentWillMount: function() {
    this.state.socket.on('ready', data => {
      var gameid = data.gameid;
      var handid = data.handid;
      var playerposition = data.playerposition;
      this.setState({ gameid, handid, playerposition });
    });
  },

  render() {
    var socket = this.state.socket;
    var others = null;
    if (this.state.playerposition>-1) {
      others = [0,1,2,3].map(pos => {
        if (pos === this.state.playerposition) return null;
        return <OtherPlayer socket={socket} key={pos} playerposition={pos} />;
      });
    }
    return (
      <div>
        <Player socket={socket} />
        <div className="others">
        { others }
        </div>
        <Discards socket={socket} />
        <Wall socket={socket} />
      </div>
    );
  }

});

module.exports = Client;