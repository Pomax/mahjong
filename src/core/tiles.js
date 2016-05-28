'use strict';

var Constants = require('./constants');

var Tiles = {
  // is... functions
  isNumeral(tn) {
    return Constants.NUMERALS <= tn && tn < Constants.HONOURS;
  },

  isTerminal(tn) {
    if (!Tiles.isNumeral(tn)) return false;
    return (tn % Constants.NUMMOD === 0 || tn % Constants.NUMMOD === Constants.NUMMOD - 1);
  },

  isHonour(tn) {
    return Constants.HONOURS <= tn && tn < Constants.BONUS;
  },

  isWind(tn) {
    return Constants.WINDS <= tn && tn < Constants.DRAGONS;
  },

  isDragon(tn) {
    return Constants.DRAGONS <= tn && tn < Constants.BONUS;
  },

  isBonus(tn) {
    return Constants.BONUS <= tn;
  },

  getTileName(tn) {
    return Constants.tileNames[tn];
  },

  getTileNumber(tn) {
    if (!Tiles.isNumeral(tn)) return false;
    return (tn % Constants.NUMMOD);
  },

  getTileSuit(tn) {
    if (Constants.BAMBOOS    <= tn  && tn < Constants.CHARACTERS) return Constants.BAMBOOS;
    if (Constants.CHARACTERS <= tn  && tn < Constants.DOTS)       return Constants.CHARACTERS;
    if (Constants.DOTS       <= tn  && tn < Constants.WINDS)      return Constants.DOTS;
    if (Constants.WINDS      <= tn  && tn < Constants.DRAGONS)    return Constants.WINDS;
    if (Constants.DRAGONS    <= tn  && tn < Constants.FLOWERS)    return Constants.DRAGONS;
    if (Constants.FLOWERS    <= tn  && tn < Constants.SEASONS)    return Constants.FLOWERS;
    return Constants.SEASONS;
  },

  sameSuit(base, ...tiles) {
    base = Tiles.getTileSuit(base);
    return !tiles.some(tn => Tiles.getTileSuit(tn)!==base);
  },

  getSuitTiles(suit) {
    var set = [];
    for(var i=suit; i<suit+Constants.NUMMOD; i++) { set.push(i); }
    return set;
  },

  getShortForm(tn) {
    return Constants.SHORTFORMS[tn];
  },

  fromShortForm(str) {
    return Constants.TILENUMBERS[str];
  },

  getPositionWind(num) {
    return ['E','S','W','N'][num];
  }
};

module.exports = Tiles;
