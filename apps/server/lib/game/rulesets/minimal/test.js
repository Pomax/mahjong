var scorePlayers = require('./scoring')

var p1 = { tiles: [], revealed: [], bonus: []};
var p2 = { tiles: [], revealed: [], bonus: []};
var p4 = { tiles: [], revealed: [], bonus: [37, 38]};
var p3 = {
  winner: true,
  tiles: [1,1,1, 2,2,2],
  revealed: [[30,30,30],[4,4,4],[5,5]],
  bonus: [36]
};
var players = [p1,p2,p3,p4];

var balance = scorePlayers(players, 0);
console.log(balance);

