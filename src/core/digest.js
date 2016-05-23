'use strict';

var Constants = require('./constants');
var md5 = require('md5');

module.exports = function digest(tiles, bonus, revealed) {
  var list = tiles.sort(Constants.sort);
  list = list.concat(bonus.sort(Constants.sort));
  var sets = revealed.sort((a,b) => b[0] - a[0]);
  sets.forEach(set => { list = list.concat(set); });
  var todigest = list.join(",");
  var digest = md5(todigest);
  return digest;
};
