var React = require('react');

var Hand = React.createClass({
  getInitialState: function() {
    this.tiles = [];
    return {
      tiles: this.tiles
    };
  },

  add: function(tile) {
    this.tiles.push(tile);
    this.tiles.sort((a,b) => a.key - b.key );
    this.setState({tiles: this.tiles});
  },

  render: function() {
    return <div>{this.state.tiles}</div>;
  }

});

module.exports = Hand;
