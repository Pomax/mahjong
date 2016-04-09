var React = require('react');
var Tile = require('../components/Tile.jsx');
var Constants = require('../../../server/lib/constants');

var Wall = React.createClass({

  generateBlanks(num) {
    var tiles = [];
    while(num--) { tiles.push('concealed'); }
    return tiles;
  },

  getInitialState() {
    return {
      tiles: this.generateBlanks(144),
      turn: this.props.turn
    };
  },

  reset: function(prevProps, prevState) {
    this.setState(this.getInitialState());
  },

  componentDidMount() {
    var socket = this.props.socket;
    socket.on("tile", this.removeTile);
    socket.on("drew", this.removeTile);
    socket.on('compensation', this.removeCompensation);
    socket.on('compensated', this.removeCompensation);
  },

  removeTile() {
    var tiles = this.state.tiles;
    tiles.pop();
    this.setState({ tiles: tiles });
  },

  removeCompensation(data) {
    var tiles = data.tiles;
    tiles.forEach(tile => this.removeTile());
  },

  formTiles() {
    return this.state.tiles.map((t,p) => <Tile key={t+'-'+p} value={t}/>);
  },

  render() {
    return <div className="wall">{ this.formTiles() }</div>;
  }

});

module.exports = Wall;