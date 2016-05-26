'use strict';

var React = require('react');

var Overlay = React.createClass({
  getInitialState() {
    return { hidden: !this.props.children };
  },

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.children !== this.props.children) {
      this.setState({ hidden: !this.props.children });
    }
  },

  hide: function(evt) {
    if (this.props.noOutsideClick) return;
    this.setState({ hidden: true });
  },

  render: function() {
    if(this.state.hidden) return null;

    var overlayStyle = {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0,0,0,0.3)',
      zIndex: 5
    };

    var contentStyle = {
      position: 'absolute',
      top: 'calc(50% - 100px)',
      height: 200,
      left: 'calc(50% - 200px)',
      width: 400,
      background: 'white',
      padding: '1em',
      borderRadius: '0.5em'
    };

    return (
      <div className="overlay" style={overlayStyle} onClick={this.hide}>
        <div className="content" style={contentStyle}>
        {this.props.children}
        </div>
      </div>
    );
  }
});

module.exports = Overlay;
