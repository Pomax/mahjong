var React = require('react');

var GameList = React.createClass({

  render: function() {
    return (
      <div>{
        Object.keys(this.props.games).map(gameid => {
          return <p key={gameid}>game {gameid}: {this.props.games[gameid]} players <button onClick={this.join(gameid)}>JOIN</button></p>;
        })
      }</div>
    );
  },

  join(gameid) {
    return (evt) => {
      this.props.joinGame(gameid);
    };
  }

});

module.exports = GameList;