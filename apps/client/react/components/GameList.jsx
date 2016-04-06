var React = require('react');

var GameList = React.createClass({

  render: function() {
    var keys = Object.keys(this.props.games);
    if(keys.length === 0) return null;

    return (
      <ul className="games">{
        keys.map(gameid => {
          return <li className="game" key={gameid}>game {gameid}: {this.props.games[gameid]} players <button onClick={this.join(gameid)}>JOIN</button></li>;
        })
      }</ul>
    );
  },

  join(gameid) {
    return (evt) => {
      this.props.joinGame(gameid);
    };
  }

});

module.exports = GameList;