var React = require('react');
var Tile = require('../components/Tile.jsx');
var Constants = require('../../../server/lib/constants');

var OtherPlayer = React.createClass({

  getInitialState() {
    return {
      tiles: [],
      bonus: [],
      revealed: []
    };
  },

  componentDidMount() {
    var socket = this.props.socket;
    socket.on("dealt", this.addTiles);
    socket.on("drew", this.addTile);
    socket.on("compensated", this.addBonus);
    socket.on("discard", this.removeTile);
    socket.on("revealed", this.revealedSet);
  },

  formTiles(tiles, sets) {
    return tiles.map((t,p) => {
      if (!sets) return <Tile key={t+'-'+p} value={t}/>;
      return t.map((t,p) => <Tile key={t+'-'+p} value={t}/>);
    });
  },

  render() {
    return (
      <div className="otherplayer">
      <span className="name">{this.props.playerposition + ':'}</span>
      <span className="tiles">{this.formTiles(this.state.tiles)}</span>
      <span className="revealed">{this.formTiles(this.state.revealed,true)}</span>
      <span className="bonus">{this.formTiles(this.state.bonus)}</span>
      </div>
    );
  },

  ours(data) {
    return (data.playerposition === this.props.playerposition);
  },

  addTiles(data) {
    if(!this.ours(data)) return;
    var tiles = this.state.tiles;
    var num = data.tileCount;
    while(num--) { tiles.push('concealed'); }
    this.setState({ tiles });
  },

  addTile(data) {
    if(!this.ours(data)) return;
    var tiles = this.state.tiles;
    tiles.push('concealed');
    this.setState({ tiles });
  },

  addBonus(data) {
    if(!this.ours(data)) return;
    var bonus = this.state.bonus.concat(data.tiles);
    this.setState({ bonus });
  },

  removeTile(data) {
    if(!this.ours(data)) return;
    var tiles = this.state.tiles;
    tiles.pop();
    this.setState({ tiles });
  },

  revealedSet(data) {
    if(!this.ours(data)) return;
    var playerpos = data.playerposition;
    var set = data.set;
    var revealed = this.state.revealed;
    revealed.push(set);
    var tiles = this.state.tiles;
    tiles.splice(0, set.length-1);
    this.setState({ tiles, revealed });
  }

});

module.exports = OtherPlayer;