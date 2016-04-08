var React = require('react');
var classnames = require('classnames');

var Tile = React.createClass({
  getDefaultProps: function() {
    return {
      tileset: 'classic',
      value: 'concealed'
    };
  },

  getInitialState: function() {
    var base = [(this.props.base || 'images/tiles'), this.props.tileset,''].join('/');
    var face = base + this.props.value + ".jpg";
    var back = base + "concealed.jpg";
    return { base, face, back, src: face };
  },

  render: function() {
    var className = classnames("tile", {
      owndiscard: this.props.ownDiscard,
      highlight: this.props.highlight
    });
    return (
      <img className={className} src={this.state.src} onClick={this.props.onClick} title={this.props.title}/>
    );
  }
});

module.exports = Tile;