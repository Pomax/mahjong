var React = require('react');

var Tile = React.createClass({
  getDefaultProps: function() {
    return {
      tileset: 'basic',
      value: 'concealed'
    };
  },

  getInitialState: function() {
    var base = ['', (this.props.base || 'images/tiles'), this.props.tileset,''].join('/');
    var face = base + this.props.value + ".jpg";
    var back = base + "concealed.jpg";
    return { base, face, back, src: face };
  },

  render: function() {
    var className = "tile";
    if (this.props.ownDiscard) {
      className += " owndiscard";
    }
    return (
      <img className={className} title={this.state.src} src={this.state.src} onClick={this.props.onClick}/>
    );
  }
});

module.exports = Tile;