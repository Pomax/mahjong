var React = require('react');
var Hand = require('./Hand.jsx');

var Player = React.createClass({
  render: function() {
    return <div>
      <h2>{this.props.name}</h2>
      <Hand ref="hand" />
    </div>;
  },


  tile: function(tile) {
    this.refs.hand.add(tile);
  }
});

module.exports = Player;
