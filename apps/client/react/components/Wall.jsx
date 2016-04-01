var React = require('react');
var Tile = require('../components/Tile.jsx');
var Constants = require('../../lib/core/constants');

var Wall = React.createClass({

  getDefaultProps: function() {
    return {
      deadsize: 16
    };
  },

  getInitialState: function() {
    this.tiles = this.formWall();
    return {
      tiles: this.tiles
    };
  },

  // In a hilarious twist of anti-convention, the Tile objects in this
  // container _absolutely_ need to be keyed on their position in the
  // array, as their position is the most important identifier.
  formWall: function() {
    var alltiles = [];
    var max = Constants.PLAYTILES;
    var i, pos=0;
    for(i=0; i<max; i++) {
      alltiles.push(<Tile value={i} key={pos++}/>);
      alltiles.push(<Tile value={i} key={pos++}/>);
      alltiles.push(<Tile value={i} key={pos++}/>);
      alltiles.push(<Tile value={i} key={pos++}/>);
    }
    max += Constants.BONUSTILES;
    for(;i<max; i++) {
      alltiles.push(<Tile value={i} key={pos++}/>);
    }
    var permuted = [];
    while(alltiles.length) {
      var len = alltiles.length;
      let pos = (Math.random() * len)|0;
      var tile = alltiles.splice(pos, 1)[0];
      permuted.push( tile );
    }
    return permuted;
  },

  tile: function() {
    var tile = this.tiles.splice(0,1)[0];
    this.setState({ tiles: this.tiles });
    return tile;
  },

  supplement: function() {
    var tile = this.tiles.pop();
    this.setState({ tiles: this.tiles });
    return tile;
  },

  render: function() {
    return <div>{this.state.tiles}</div>;
  }

});

module.exports = Wall;