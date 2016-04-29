var React = require('react');
var Tile = require('../components/Tile.jsx');
var Tiles = require('../../../../lib/game/tiles');
var Constants = require('../../../../lib/game/constants');

var Discards = React.createClass({

  getInitialState() {
    return {
      tiles: [],
      turn: this.props.turn
    };
  },

  reset: function(prevProps, prevState) {
    this.setState(this.getInitialState());
  },

  componentDidMount: function() {
    var socket = this.props.socket;
    socket.on("unclaimed", this.addDiscard);
  },

  addDiscard(data) {
    var tiles = this.state.tiles;
    tiles.push(data.tile);
    this.setState({ tiles });
  },

  formTiles() {
    return this.state.tiles.map((t,p) => <Tile key={t+'-'+p} value={t} title={"discarded "+Tiles.getTileName(t)}/>);
  },

  render() {
    return <div className="discards row">{ this.formTiles() }</div>;
  }

});

module.exports = Discards;