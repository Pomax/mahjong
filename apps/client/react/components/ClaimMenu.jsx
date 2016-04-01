var React = require('react');
var Constants = require('../../../server/lib/constants');

var ClaimMenu = React.createClass({

  render: function() {
    return (
      <div className="claimmenu">
        <button onClick={this.dismiss}>dismiss</button>
        <button onClick={this.chow}>chow</button>
        <button onClick={this.pung}>pung</button>
        <button onClick={this.kong}>kong</button>
        <button onClick={this.win}>win</button>
      </div>
    );
  },

  dismiss: function() {
    this.props.claim(Constants.NOTILE);
  },

  chow: function() {
    this.props.claim(Constants.CHOW);
  },

  pung: function() {
    this.props.claim(Constants.PUNG);
  },

  kong: function() {
    this.props.claim(Constants.KONG);
  },

  win: function() {
    this.props.claim(Constants.WIN);
  }
});

module.exports = ClaimMenu;
