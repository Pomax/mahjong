var React = require('react');
var ReactDOM = require('react-dom');

var Settings = require('../lib/playersettings');
var ClientPassThrough  = require('./client-pass-through');

/**
 * ES5, because ES6 and React are a bad trip.
 */
var ClientApp = React.createClass({
  getInitialState() {
    var params = {};
    window.location.search.replace('?','').split('&').forEach(t => {
      let v = t.split('=');
      params[v[0]] = v[1];
    });

    return {
      client: false,
      settings: new Settings(params.localStorageId)
    };
  },

  render() {
    return (
      <div className="client">
        <input type="text" value={this.state.settings.name} onChange={this.changePlayerName} />
        <button onClick={this.registerPlayer}>register player</button>
        { this.renderLobby() }
        { this.renderTiles() }
      </div>
    );
  },

  renderLobby() {
    if (!this.state.client) return null;
    return (
      <div>
        <hr/>
        <div>Client connected on {this.state.client.connector.port}</div>
        <button onClick={this.startGame}>Start a game</button>
      </div>
    );
  },

  renderTiles() {
    if (!this.state.tiles) return null;
    var tiles = this.state.tiles.map((tile,id) => {
      return <button disabled={!this.state.discarding} key={tile+'-'+id} onClick={this.discard}>{tile}</button>;
    });
    var bonus = this.state.bonus.map((tile,id) => {
      return <button disabled="disabled" key={tile+'-'+id}>{tile}</button>;
    });
    var revealed = this.state.revealed.map((set,sid) => {
      return <div>{
        set.map((tile,id) => {
          let key ='set-'+sid+'-'+tile+'-'+id;
          return <button disabled="disabled" key={key}>{tile}</button>;
        })
      }</div>;
    });
    return <div>
      <div>{tiles}</div>
      <div>{bonus}</div>
      <div>{revealed}</div>
    </div>;
  },


  changePlayerName(evt) {
    var settings = this.state.settings;
    settings.setName(evt.target.value);
    this.setState({ settings });
  },

  registerPlayer() {
    var name = this.state.settings.name;
    fetch('/register/pomax')
    .then(response => response.json())
    .then(data => {
      var id = data.id;
      var port = data.port;
      new ClientPassThrough(name, port, client => {
        this.setState({ id, port, client });
        client.bindApp(this);
      });
    });
  },

  startGame() {
    fetch('/game/new/' + this.state.id + '/' + this.state.settings.name)
    .then(response => response.json())
    .then(data => {
      var gameid = data.id;
      // the actual game kicks off via websockets communication
    });
  },

  setTiles(tiles, bonus, revealed) {
    this.setState({ tiles, bonus, revealed, discarding:true });
  },

  discard(evt) {
    var tile = parseInt(evt.target.textContent);
    this.setState({ discarding:false }, () => {
      this.state.client.processTileDiscardChoice(tile);
    });
  }
});

ReactDOM.render(<ClientApp/>, document.getElementById('client'));
