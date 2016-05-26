var React = require('react');
var ReactDOM = require('react-dom');

var Settings = require('../lib/playersettings');
var Constants = require('../../../core/constants');
var Tiles = require('../../../core/tiles');
var ClientPassThrough  = require('../lib/client-pass-through');

var Tile = require('./Tile.jsx');
var Overlay = require('./Overlay.jsx');
var ClaimMenu = require('./ClaimMenu.jsx');

var wikiImageCache = {};
function getWikiImages(article, callback) {
  if (wikiImageCache[article]) return callback(wikiImageCache[article]);
  require("superagent").get("/thumb/"+article).end(function(err, res){
    wikiImageCache[article] = res.text.replace(/"/g,'');
    getWikiImages(article, callback);
  });
}

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
      settings: new Settings(params.localStorageId),
      currentDiscard: false
    };
  },

  render() {
    return (
      <div className="client" ref="background" onClick={this.backGroundClicked}>
        <Overlay>{this.state.modal ? this.state.modal : null}</Overlay>
        <input type="text" value={this.state.settings.name} onChange={this.changePlayerName} />
        { this.state.client ? null : <button onClick={this.registerPlayer}>register player</button> }
        { this.state.currentGame ? <div>Client connected using a websocket on port {this.state.client.connector.port}</div> : null }
        { this.renderLobby() }
        { this.renderDiscard() }
        { this.renderPlayers() }
      </div>
    );
  },

  backGroundClicked(evt) {
    if (this.state.currentDiscard && this.canDismiss) {
      this.ignoreClaim();
    }
  },

  renderLobby() {
    if (!this.state.client || this.state.currentGame) return null;
    return (
      <div>
        <hr/>
        {this.state.currentGame ? null : <button onClick={this.startSingleGame}>Start a single player game</button> }
        {this.state.currentGame ? null : <button onClick={this.startRegularGame}>Start a regular game</button> }
        {this.state.pendingGameId ? <button onClick={this.addBotToGame}>Add a bot to my game</button> : null }
        { this.renderAvailableGames() }
      </div>
    );
  },

  renderAvailableGames() {
    var list = this.state.gamelist;
    if (!list) return null;
    return Object.keys(list).map(gameid => {
      let game = list[gameid];
      return <div className="available-game" key={"game-"+gameid}>
        <span>
          {gameid}: {game.join(', ')} {
            (this.state.pendingGameId == gameid) ? null : (game.length >= 4) ? <span>[in progress]</span> : this.renderJoinButton(gameid)
          }
        </span>
      </div>;
    });
  },

  renderJoinButton(gameid) {
    return <button onClick={evt => this.joinRegularGame(gameid)}>join</button>;
  },

  renderPlayers() {
    if (!this.state.players) return null;

    var players = this.state.players.map((player,position) => {
      if (position === this.state.currentGame.position) {
        return this.renderTiles();
      }
      return (
        <div className="other player" key={'player'+position}>
          <div className="name">{this.linkPlayerName(player.name)} ({this.getWindFor(player.position)})</div>
          <div className="handsize">{ this.renderOtherPlayerTiles(player) }</div>
          <div className="revealed">{ player.revealed.map((set,sid) => set.map((tile,id) => <Tile value={tile} key={sid + '-' + 'tile' + '-' + id}/>)) }</div>
          <div className="bonus">{ player.bonus.map((tile,id) => <Tile value={tile} key={tile + '-' + id}/>) }</div>
          { this.renderCurrentDiscard(position) }
        </div>
      );
    });
    return <div className="players">{players}</div>;
  },

  renderTiles() {
    if (!this.state.tiles) return null;
    var dpos = this.state.tiles.indexOf(this.state.drawtile);
    var tiles = this.state.tiles.map((tile,id) => {
      var highlight = (dpos && dpos===id);
      return <Tile disabled={!this.state.discarding} key={tile+'-'+id} onClick={this.discard} value={tile} highlight={highlight}/>;
    });
    var bonus = this.state.bonus.map((tile,id) => {
      return <Tile disabled="disabled" key={tile+'-'+id} value={tile} />;
    });
    var revealed = this.state.revealed.map((set,sid) => {
      return <div className="set">{
        set.map((tile,id) => {
          let key ='set-'+sid+'-'+tile+'-'+id;
          return <Tile disabled="disabled" key={key} value={tile} />;
        })
      }</div>;
    });
    return <div className="player">
      <div className="name">{this.linkPlayerName(this.state.settings.name)} ({this.getWindFor(this.state.currentGame.position)})</div>
      <div className="tiles">{tiles}</div>
      <div className="revealed">{revealed}</div>
      <div className="bonus">{bonus}</div>
      { this.renderCurrentDiscard(this.state.currentGame.position) }
    </div>;
  },

  renderOtherPlayerTiles(player) {
    var tiles = [];
    if (player.tiles) {
      tiles = player.tiles.map((tile,id) => <Tile value={tile} key={tile + '-' + id}/>);
    } else {
      var n = player.handSize;
      while(n--) { tiles.push(<Tile value='concealed' key={n}/>); }
    }
    return tiles;
  },

  renderCurrentDiscard(position) {
    if (!this.state.currentDiscard || this.state.currentDiscard.from !== position) {
      return null;
    }
    return <div className="currentDiscard"><Tile onClick={this.getClaim} value={this.state.currentDiscard.tile}/></div>;
  },

  splitPlayerName(name) {
    var bits = name.split(' ');
    var adjective = bits[0];
    var wiki = bits.slice(1).map((s,id) => id===0? s : s.toLowerCase()).join(' ');
    return [adjective, wiki];
  },

  linkPlayerName(name) {
    var [adjective, wikilink] = this.splitPlayerName(name);
    var ref = 'img-'+name;
    var src = '/images/unknown-thumb.png';
    var href= null;
    var img = <img className="player-thumb" src={src} ref={ref} />;
    if (adjective && wikilink) {
      getWikiImages(wikilink, src => (this.refs[ref].src = src));
      href = "https://wikipedia.org/wiki/" + wikilink;
    }
    return <span><a href={href} target="_blank">{img}</a>{adjective} <a href={href} target="_blank">{wikilink}</a></span>;
  },

  getWindFor(position) {
    return Tiles.getPositionWind(position);
  },

  renderDiscard() {
    var content = null;
    var currentDiscard = this.state.currentDiscard;
    if (!currentDiscard) return <div className="discard"/>;

    if (currentDiscard.from !== this.state.currentGame.position) {
      let from = this.state.players[this.state.currentDiscard.from].name;
      content = this.state.claiming ? this.renderClaim() : <div>
        Click&nbsp;
        <Tile onClick={this.getClaim} value={this.state.currentDiscard.tile} />
        &nbsp;to claim it (discarded by {from})
      </div>;
    }
    if (this.state.confirmWin) {
      content = <span><button onClick={this.confirmWin}>confirm win</button> or discard a tile to keep playing</span>;
    }
    return <div className="discard">{content}</div>;
  },

  renderClaim() {
    var from = this.state.currentDiscard.from;
    var mayChow = (from + 1)%4 === this.state.currentGame.position;
    return <ClaimMenu mayChow={mayChow} claim={this.sendClaim} />;
  },

  changePlayerName(evt) {
    var settings = this.state.settings;
    settings.setName(evt.target.value);
    this.setState({ settings });
  },

  registerPlayer() {
    var name = this.state.settings.name;
    if (!name) {
      return alert("you need to fill in a name");
    }
    var uuid = this.state.settings.uuid || 'no-uuid';
    var url = '/register/' + name + '/' + uuid;
    fetch(url)
    .then(response => response.json())
    .then(data => {
      var id = data.id;
      var uuid = data.uuid;
      var settings = this.state.settings;
      settings.setUUID(uuid);
      var port = data.port;
      new ClientPassThrough(name, uuid, port, client => {
        this.setState({ id, port, client });
        client.bindApp(this);
      });
    });
  },

  startSingleGame() {
    var url = '/game/single/' + this.state.id + '/' + this.state.settings.uuid;
    fetch(url)
    .then(response => response.json())
    .then(data => {
      // the actual play negotiations happen via websockets
    });
  },

  startRegularGame() {
    var url = '/game/new/' + this.state.id + '/' + this.state.settings.uuid;
    fetch(url)
    .then(response => response.json())
    .then(data => this.setState({ pendingGameId: data.gameid }));
  },

  addBotToGame() {
    var url = '/game/addbot/' + this.state.pendingGameId + '/' + this.state.id + '/' + this.state.settings.uuid;
    fetch(url)
    .then(response => response.json())
    .then(data => {
      // the actual play negotiations happen via websockets
    });
  },

  joinRegularGame(gameid) {
    var url = '/game/join/' + gameid + '/' + this.state.id + '/' + this.state.settings.uuid;
    fetch(url)
    .then(response => response.json())
    .then(data => this.setState({ pendingGameId: gameid }));
  },

  updateGameList(gamelist) {
    this.setState({ gamelist });
  },

  setGameData(data) {
    var players = [0,1,2,3].map(position => {
      if(position !== data.position) {
        return {
          name: data.playerNames[position],
          position,
          handSize: 0,
          bonus: [],
          revealed: []
        };
      }
      return { name : this.state.settings.name };
    });
    this.setState({
      currentGame: data,
      players,
      pendingGameId: false,
      tiles: [],
      bonus: [],
      revealed: []
    });
    if (data.tileSituation) {
      this.updatePlayerInformation(data.tileSituation, data.currentDiscard);
    }
  },

  // used for reconnections, to make sure we reflect
  // other players correctly.
  updatePlayerInformation(tileSituation, currentDiscard) {
    var players = this.state.players;
    players.forEach(player => {
      var situation = tileSituation[player.name];
      player.handSize = situation.handSize;
      player.bonus = situation.bonus;
      player.revealed = situation.revealed;
    });
    var us = tileSituation[this.state.settings.name];
    this.setState({
      players,
      tiles: us.tiles,
      bonus: us.bonus,
      revealed: us.revealed,
      discarding: !currentDiscard,
      currentDiscard
    });
  },

  setInitialTiles(tiles) {
    var players = this.state.players;
    players.map(player => {
      if(player.position !== this.state.currentGame.position) {
        player.handSize = tiles.length;
      }
    });
    this.setState({ players, tiles });
  },

  addTile(tile, wallSize) {
    this.setState({ drawtile: tile });
  },

  playerReceivedDeal(playerPosition) {
    var players = this.state.players;
    players[playerPosition].handSize++;
    this.setState({
      players,
      currentDiscard: false
    });
  },

  setTilesPriorToDiscard(tiles, bonus, revealed) {
    this.setState({ currentDiscard: false, tiles, bonus, revealed, discarding:true });
  },

  discard(evt) {
    var tile = parseInt(evt.target.getAttribute('data-tile'));
    var tiles = this.state.tiles;
    var pos = tiles.indexOf(tile);
    tiles.splice(pos,1);
    this.setState({
      drawtile: false,
      discarding: false,
      confirmWin: false
    }, () => {
      tiles,
      this.state.client.processTileDiscardChoice(tile);
    });
  },

  determineClaim(from, tile, sendClaim) {
    if (from === this.state.currentGame.position) {
      // if we discarded in error, we might be able
      // to yell "no wait give it back", but that logic
      // is not currently available.
      sendClaim({ claimType: Constants.NOTHING });
    }
    var players = this.state.players;
    players[from].handSize--;
    this.setState({
      players,
      currentDiscard: { from, tile, sendClaim }
    }, () => { this.canDismiss = true; });
  },

  ignoreClaim() {
    var claim = { claimType: Constants.NOTHING };
    this.state.currentDiscard.sendClaim(claim);
    this.setState({ currentDiscard: false });
  },

  getClaim() {
    this.canDismiss = false;
    this.state.client.requestTimeoutInvalidation();
    this.setState({ claiming: true });
  },

  sendClaim(claimType, winType) {
    this.state.currentDiscard.sendClaim({ claimType, winType});
    this.setState({ claiming: false });
  },

  tileClaimed(tile, by, claimType, winType) {
    this.setState({ currentDiscard: false, confirmWin: (claimType===Constants.WIN) });
  },

  confirmWin() {
    this.setState({ confirmWin: false}, () => {
      this.state.client.discardFromApp(Constants.NOTILE);
    });
  },

  recordReveal(playerPosition, tiles) {
    var players = this.state.players;
    var player = players[playerPosition];
    player.handSize = Math.max(player.handSize - 3, 0);
    player.revealed.push(tiles);
    this.setState({ players });
  },

  recordBonus(playerPosition, tiles) {
    if (playerPosition === this.state.currentGame.position) return;
    var players = this.state.players;
    var player = players[playerPosition];
    player.bonus = player.bonus.concat(tiles);
    this.setState({ players });
  },

  revealAllTiles(alltiles, onReveal) {
    var players = this.state.players;
    players.forEach(player => {
      let side = alltiles[player.name];
      player.tiles = side.tiles;
      player.bonus = side.bonus;
      player.revealed = side.revealed;
    });
    this.setState({ players }, onReveal);
  },

  handDrawn(alltiles, acknowledged) {
    this.revealAllTiles(alltiles, () => {
      this.setState({
        modal: <button onClick={acknowledged}>Hand was a draw</button>
      });
    });
  },

  handWon(winner, selfdrawn, alltiles, acknowledged) {
    this.revealAllTiles(alltiles, () => {
      var player = this.state.players[winner];
      this.setState({
        modal: <button onClick={acknowledged}>hand was won by {player.name}</button>
      });
    });
  }
});

ReactDOM.render(<ClientApp/>, document.getElementById('client'));
