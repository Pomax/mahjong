/**
 * This component negotiates which game to join at the server,
 * and knows how to use localStorage to make sure your player
 * information is kept around for future connections (including
 * reconnecting if the socket breaks at any point in time).
 */
var React = require('react');
var GameList = require('./GameList.jsx');

var Lobby = React.createClass({

  getInitialState() {
    return {
      games: {}
    };
  },

  componentDidMount() {
    this.props.socket.emit("listen:games");

    this.props.socket.on("gameslist", data => {
      this.setState({ games: data.games });
    });

    this.props.socket.on("newgame:made", data => {
      this.joinGame(data.gameid);
    });

    this.props.socket.on("player:registered", data => {
      var gameid = parseInt(data.gameid);
      var playerid = parseInt(data.playerid);
      this.props.joinGame(gameid, playerid);
    });
  },

  joinGame(gameid) {
    this.props.socket.emit("listen:stop", {});
    this.props.socket.emit("player:register", { gameid });
  },

  newGame() {
    this.props.socket.emit("newgame:request");
  },

  render() {
    return (
      <div>
        <GameList games={this.state.games} joinGame={this.joinGame} />
        <button onClick={this.newGame}>start a new game</button>
      </div>
    );
  }
});

module.exports = Lobby;
