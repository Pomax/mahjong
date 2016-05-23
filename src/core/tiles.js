'use strict';

var Constants = require('./constants');

var Tiles = {
  // is... functions
  isNumeral: function(tn) {
    return Constants.NUMERALS <= tn && tn < Constants.HONOURS;
  },
  isTerminal: function(tn) {
    if (!Tiles.isNumeral(tn)) return false;
    return (tn % Constants.NUMMOD === 0 || tn % Constants.NUMMOD === Constants.NUMMOD - 1);
  },
  isHonour: function(tn) {
    return Constants.HONOURS <= tn && tn < Constants.BONUS;
  },
  isWind: function(tn) {
    return Constants.WINDS <= tn && tn < Constants.DRAGONS;
  },
  isDragon: function(tn) {
    return Constants.DRAGONS <= tn && tn < Constants.BONUS;
  },
  isBonus: function(tn) {
    return Constants.BONUS <= tn;
  },
  getTileName: function(tn) {
    return Constants.tileNames[tn];
  },
  getTileNumber: function(tn) {
    if (!Tiles.isNumeral(tn)) return false;
    return (tn % Constants.NUMMOD);
  },
  getTileSuit: function(tn) {
    if (Constants.BAMBOOS    <= tn  && tn < Constants.CHARACTERS) return Constants.BAMBOOS;
    if (Constants.CHARACTERS <= tn  && tn < Constants.DOTS)       return Constants.CHARACTERS;
    if (Constants.DOTS       <= tn  && tn < Constants.WINDS)      return Constants.DOTS;
    if (Constants.WINDS      <= tn  && tn < Constants.DRAGONS)    return Constants.WINDS;
    if (Constants.DRAGONS    <= tn  && tn < Constants.FLOWERS)    return Constants.DRAGONS;
    if (Constants.FLOWERS    <= tn  && tn < Constants.SEASONS)    return Constants.FLOWERS;
    return Constants.SEASONS;
  },
  getSuitTiles: function(suit) {
    var set = [];
    for(var i=suit; i<suit+Constants.NUMMOD; i++) { set.push(i); }
    return set;
  },
  getShortForm: function(tn) {
    return Constants.SHORTFORMS[tn];
  },
  fromShortForm: function(str) {
    return Constants.TILENUMBERS[str];
  },
  getPositionWind: function(num) {
    return ['E','S','W','N'][num];
  }
};

module.exports = Tiles;
