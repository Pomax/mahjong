var React = require('react');
var Link = require('react-router').Link;

var Page = React.createClass({

  getDefaultProps() {
    return {
      title: "Mahjong"
    };
  },

  contextTypes: {
    router: React.PropTypes.object
  },

  render: function() {
    return (
      <div className="page-wrapper">
        <header>
          <h1><Link to={'/'}>Mahjong</Link></h1>
        </header>
        <div className="content">
          { this.props.children }
        </div>
      </div>
    );
  }

});

module.exports = Page;