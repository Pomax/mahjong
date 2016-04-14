/**
 * This component negotiates which game to join at the server,
 * and knows how to use localStorage to make sure your player
 * information is kept around for future connections (including
 * reconnecting if the socket breaks at any point in time).
 */
var React = require('react');
var rulesets = require('../../../server/lib/game/rulesets');

var Lobby = React.createClass({

  getInitialState() {
    return {
      games: {},
      gamename: "",
      playername: this.props.settings.name,
      ruleset: Object.keys(rulesets)[0],
      gameid: -1,
      playerid: -1
    };
  },

  componentDidMount() {
    // start sending us updates about available games
    this.props.socket.emit("sendgames");
    this.props.socket.on("gamelist", data => {
      this.setState({ games: data.games });
    });

    // sent in response to a newgame request by the player
    this.props.socket.on("madegame", data => {
      this.joinGame(data.gameid);
      console.log("server made game", data.gameid);
    });

    // sent in response to a joingame request by the player
    this.props.socket.on("joinedgame", data => {
      // show user as joined for this game
      this.setState({
        gameid: parseInt(data.gameid),
        playerid: parseInt(data.playerid)
      });
      console.log(data.playerid, "joined game", data.gameid);
    });

    // sent in response to a leavegame request by the player
    this.props.socket.on("leftgame", data => {
      // no longer show user as joined for this game
      this.setState({
        gameid: -1,
        playerid: -1
      });
      console.log("left game", data.gameid);
    });

    // A game this player is joined to is ready to begin,
    // which means the lobby needs to inform the client
    // to switch over the UI to game play mode.
    this.props.socket.on("readygame", data => {
      console.log("readygame received");
      this.props.readyGame(data);
    });
  },

  render() {
    var keys = Object.keys(this.state.games);


    return (
      <div className="lobby">
        <div className="player-information">
          <label>Your name: </label>
          <input type="text" value={this.state.playername} onChange={this.updatePlayerName}/>
        </div>

        <div className="games">{
          keys.length===0 ?
            <div>No games found</div>
            :
            keys.map(gameid => {
              var joined = (this.state.gameid == gameid); // coerced comparison
              var game = this.state.games[gameid];
              return (
                <div className="game" key={"game" + gameid}>
                  <div className="name">{game.name}</div>
                  <div className="rules">rules: {game.ruleset}</div>
                  <div className="count">players: {game.players.length} ({ game.players.join(', ') })</div>
                  {
                    joined ?
                    <button onClick={this.leaveGame}>LEAVE</button>
                    :
                    <button onClick={evt => this.joinGame(gameid)}>JOIN</button>
                  }
                </div>
              );
            })
        }</div>

        <div className="new">
          Game name: <input type="text" ref="gamename" value={this.state.gamename} onChange={this.updateGameName}/>
          Ruleset: { this.getRulesets() }
          <button onClick={this.newGame}>start a new game</button>
        </div>
      </div>
    );
  },

  getRulesets() {
    var options = Object.keys(rulesets).map(name => <option key={name} value={name}>{name}</option>);
    return <select value={this.state.ruleset} onChange={this.setNewRuleset}>{options}</select>;
  },

  updatePlayerName(evt) {
    var playername = evt.target.value;
    this.setState({ playername }, () => this.props.settings.setName(playername));
  },

  updateGameName(evt) {
    this.setState({
      gamename: evt.target.value
    });
  },

  setNewRuleset(evt) {
    this.setState({ ruleset: evt.target.value });
  },


  // player wants to make a new game
  newGame() {
    var playername = this.props.settings.name || false;
    var name = this.state.gamename;
    var ruleset = this.state.ruleset;
    this.props.socket.emit("newgame", {
      name,
      ruleset,
      playername
    });
    // leads to the server sending "madegame"
  },

  // player wants to join an existing game
  joinGame(gameid) {
    this.props.socket.emit("joingame", {
      gameid,
      playername: this.props.settings.name
    });
    // leads to the server sending "joinedgame"
  },

  // player wants to leave a game that they joined,
  // but which hasn't started yet.
  leaveGame() {
    this.props.socket.emit("leavegame", {
      gameid: this.state.gameid,
      playerid: this.state.playerid,
      playername: this.props.settings.name
    });
  }
});

module.exports = Lobby;
