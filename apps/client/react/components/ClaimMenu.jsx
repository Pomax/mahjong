var React = require('react');
var Constants = require('../../../server/lib/constants');

var ClaimMenu = React.createClass({

  getInitialState() {
    return { winclaim: false };
  },

  render: function() {
    if (this.state.winclaim) {
      return this.renderWinMenu();
    }
    var chowButtons = this.props.mayChow ? [
      <button className="chow" key="chow1" onClick={this.chow1}>chow</button>,
      <button className="chow" key="chow2" onClick={this.chow2}>chow</button>,
      <button className="chow" key="chow3" onClick={this.chow3}>chow</button>
    ] : [];
    return (
      <div className="claimmenu">
        <button onClick={this.dismiss}>dismiss</button>
        { chowButtons }
        <button onClick={this.pung}>pung</button>
        <button onClick={this.kong}>kong</button>
        <button onClick={this.win}>win</button>
      </div>
    );
  },

  dismiss: function() { this.props.claim(Constants.NOTILE); },
  chow1:   function() { this.props.claim(Constants.CHOW1);  },
  chow2:   function() { this.props.claim(Constants.CHOW2);  },
  chow3:   function() { this.props.claim(Constants.CHOW3);  },
  pung:    function() { this.props.claim(Constants.PUNG);   },
  kong:    function() { this.props.claim(Constants.KONG);   },
  win:     function() { this.setState({winclaim: true});    },

  renderWinMenu: function() {
    return (
      <div className="winmenu">
        <button onClick={this.dismiss}>dismiss</button>
        <button onClick={this.winPair}>pair</button>
        <button className="chow" onClick={this.winChow1}>chow</button>
        <button className="chow" onClick={this.winChow2}>chow</button>
        <button className="chow" onClick={this.winChow3}>chow</button>
        <button onClick={this.winPung}>pung</button>
      </div>
    );
  },

  winPair:  function() { this.props.claim(Constants.WIN, Constants.PAIR);  },
  winChow1: function() { this.props.claim(Constants.WIN, Constants.CHOW1); },
  winChow2: function() { this.props.claim(Constants.WIN, Constants.CHOW2); },
  winChow3: function() { this.props.claim(Constants.WIN, Constants.CHOW3); },
  winPung:  function() { this.props.claim(Constants.WIN, Constants.PUNG);  }

});

module.exports = ClaimMenu;
