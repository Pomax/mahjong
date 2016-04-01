var Constants = require('../constants');
var Tile = require('./tile');

module.exports = {
  create: function(tileNumber, concealed) {
    return new Tile(tileNumber, concealed);
  },
  // is... functions
  isNumeral: function(tile) {
    var tn = tile.tileNumber;
    return Constants.NUMERALS <= tn && tn < Constants.HONOURS;
  },
  isTerminal: function(tile) {
    if (!this.isNumeral(tile)) return false;
    var tn = tile.tileNumber;
    return (tn % Constants.NUMMOD === 0 || tn % Constants.NUMMOD === 8);
  },
  isHonour: function(tile) {
    var tn = tile.tileNumber;
    return Constants.HONOURS <= tn && tn < Constants.BONUS;
  },
  isWind: function(tile) {
    var tn = tile.tileNumber;
    return Constants.WINDS <= tn && tn < Constants.DRAGONS;
  },
  isDragon: function(tile) {
    var tn = tile.tileNumber;
    return Constants.DRAGONS <= tn && tn < Constants.BONUS;
  },
  isBonus: function(tile) {
    var tn = tile.tileNumber;
    return Constants.BONUS <= tn;
  },
  getTileName: function(tile) {
    return Constants.tileNames[tile.tileNumber];
  },
  getTileSuit: function(tileNumber) {
    if (Constants.BAMBOOS    <= tileNumber  && tileNumber < Constants.CHARACTERS) return Constants.BAMBOOS;
    if (Constants.CHARACTERS <= tileNumber  && tileNumber < Constants.DOTS)       return Constants.CHARACTERS;
    if (Constants.DOTS       <= tileNumber  && tileNumber < Constants.WINDS)      return Constants.DOTS;
    if (Constants.WINDS      <= tileNumber  && tileNumber < Constants.DRAGONS)    return Constants.WINDS;
    if (Constants.DRAGONS    <= tileNumber  && tileNumber < Constants.FLOWERS)    return Constants.DRAGONS;
    if (Constants.FLOWERS    <= tileNumber  && tileNumber < Constants.SEASONS)    return Constants.FLOWERS;
    return Constants.SEASONS;
  },
  isLegalChow: function(t1, t2, t3) {
    if(t1 >= Constants.HONOURS) return false;
    if(t2 >= Constants.HONOURS) return false;
    if(t3 >= Constants.HONOURS) return false;
    if(t1 !== t2-1) return false;
    if(t2 !== t3-1) return false;
    var s1 = this.getTileSuit(t1);
    var s2 = this.getTileSuit(t2);
    if(s1 != s2) return false;
    var s3 = this.getTileSuit(t3);
    if(s1 != s3) return false;
    return true;
  },
  getClaimType: function(holdType) {
    if(holdType === Constants.CONNECTED)    return Constants.CHOW;
    else if(holdType === Constants.GAPPED) return Constants.CHOW;
    else if(holdType === Constants.PAIR)   return Constants.PUNG;
    else if(holdType === Constants.PUNG)   return Constants.KONG;
    return Constants.NOTHING;
  },
  getClaimReason: function(claimType) {
    if(claimType === Constants.PAIR)    return Constants.SINGLE;
    else if(claimType === Constants.CHOW)    return Constants.CONNECTED;
    else if(claimType === Constants.PUNG)   return Constants.PAIR;
    else if(claimType === Constants.KONG)   return Constants.PUNG;
    return Constants.NOTHING;
  },
  getTileType: function(tileNumber, tileList) {
    var isPair = false;

    // part of a pair?
    if(tileList.indexOf(tileNumber) !== -1) {
      // we know we can use it for a pair, but can we use it for a pung?
      tileList.splice(tileList.indexOf(tileNumber), 1);
      if(tileList.indexOf(tileNumber) !== -1) {
        // we know we can use it for a pung, but can we use it for a kong?
        tileList.splice(tileList.indexOf(tileNumber), 1);
        if(tileList.indexOf(tileNumber) !== -1) {
          return Constants.KONG;
        }
        // we can't use it for a kong, so: pung it is.
        return Constants.PUNG;
      }
      // we can't use it for a pung. So this might be a Chow.
      isPair = true;
    }

    // if we get here, we might be able to form a chow from a connected pair or gapped chow
    var bestType = (isPair ? Constants.PAIR : Constants.SINGLE);

    // We can't chow honours. This might "break" for rule sets, but for now we don't care about those.
    if (tileNumber >= Constants.HONOURS) { return bestType; }

    // part of a connected pair or gapped chow?
    var prev2 = tileNumber-2;
    var prev1 = tileNumber-1;
    var next1 = tileNumber+1;
    var next2 = tileNumber+2;

    var suit = this.getTileSuit(tileNumber);
    var p2 = (this.getTileSuit(prev2) === suit && tileList.indexOf(prev2) !== -1);
    var p1 = (this.getTileSuit(prev1) === suit && tileList.indexOf(prev1) !== -1);
    var n1 = (this.getTileSuit(next1) === suit && tileList.indexOf(next1) !== -1);
    var n2 = (this.getTileSuit(next2) === suit && tileList.indexOf(next2) !== -1);

    // this tile at the end?
    if((p1||p2) && this.isLegalChow(prev2, prev1, tileNumber)) {
      //console.log("prev", prev2, p2, prev1, p1, "[", tileNumber, "]", true);
      if(p1 && p2) { bestType = Math.max(bestType, Constants.CHOW); }
      else if(p1 && !p2) { bestType = Math.max(bestType, Constants.CONNECTED); }
      else { bestType = Math.max(bestType, Constants.GAPPED); }
    }

    // this tile in the middle?
    if((p1||n1) && this.isLegalChow(prev1, tileNumber, next1)) {
      //console.log("mid", prev1, p1, "[", tileNumber, "]", true, next1, n1);
      if(!p1 || !n1) { bestType = Math.max(bestType, Constants.CONNECTED); }
      else { bestType = Math.max(bestType, Constants.CHOW); }
    }

    // this tile at the start?
    if((n1||n2) && this.isLegalChow(tileNumber, next1, next2)) {
      //console.log("next", "[", tileNumber, "]", true, next1, n1, next2, n2);
      if(n1 && n2) { bestType = Math.max(bestType, Constants.CHOW); }
      else if(n1 && !n2) { bestType = Math.max(bestType, Constants.CONNECTED); }
      else { bestType = Math.max(bestType, Constants.GAPPED); }
    }

    // definitely not a chow.
    return bestType;
  },
  // Determine whether a combination of [tileNumber,...], [partOfPair,...] and {size: function() this.open.length; }
  // constitutes a winning hand or not. This is a fairly naive function.
  isWinningPattern: function(values, open) {
    var setCount = 4 - open.length;
    var pairCount = 1;
    var i, v;
    for(i=0; i<values.length; i++) {
      v = values[i];
      if(v === Constants.CONNECTED || v === Constants.GAPPED) {
        return false;
      }
      if(v === Constants.PUNG || v === Constants.CHOW) {
        if(values[i+1]!==v ||values[i+2]!==v) { return false; }
        setCount--;
        if(setCount<0) { return false; }
        i+=2;
      }
      if(v === Constants.PAIR) {
        if(values[i+1]!==v) { return false; }
        pairCount--;
        if(pairCount<0) { return false; }
        i+=1;
      }
    }
    console.log("win result: "+setCount+"/"+pairCount);

    if(setCount === 0 && pairCount === 0) {
      console.log("win result: "+setCount+"/"+pairCount+" (sum is "+(setCount+pairCount)+")");
    }
    return (setCount+pairCount === 0);
  },
  // value sort
  valueFunction: function(a,b) {
    // TODO: this doesn't take suit counts into account. It's much
    //       better to discard dots 1 if you characters 1, 4 and 8
    if(a >= Constants.HONOURS && b >= Constants.HONOURS) { return b-a; }
    if(a >= Constants.HONOURS && b < Constants.HONOURS) { return 1; }
    if(a < Constants.HONOURS && b >= Constants.HONOURS) { return -1; }
    if(a < Constants.HONOURS && b < Constants.HONOURS) {
      a = a % 9;
      b = b % 9;
      if((a===0 || a===8) && (b!==0 && b!== 8)) { return 1; }
      if((b===0 || b===8) && (a!==0 && a!== 8)) { return -1; }
    }
    return 0;
  }
};
