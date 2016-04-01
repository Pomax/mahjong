var React = require('react');

var DiscardPool = React.createClass({
  getInitialState: function() {
    this.tiles = [];
    return {
      tiles: this.tiles
    };
  },

  render: function() {
    return <div>{this.state.tiles}</div>;
  },

  add: function(tiles) {
    this.tiles = this.tiles.concat(tiles);
    this.setState({ tiles: this.tiles });
  }

});

module.exports = DiscardPool;