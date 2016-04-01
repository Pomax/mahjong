var React = require('react');

var Tile = React.createClass({
  getDefaultProps: function() {
    return {
      value: 'concealed'
    };
  },

  getInitialState: function() {
    var base = '/' + (this.props.base || 'images/tiles') + '/';
    var face = base + this.props.value + ".jpg";
    var back = base + "concealed.jpg";
    return { base, face, back, src: face };
  },

  render: function() {
    return (
      <img className="tile" title={this.state.src} src={this.state.src} onClick={this.props.onClick}/>
    );
  }
});

module.exports = Tile;