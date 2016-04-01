/**
 * Create a hand object populated with tiles based on a list of tile numbers.
 */
var formHand = function(tileNumberArray) {
  var hand = new Hand();
  tileNumberArray.forEach(function(tileNumber) {
    hand.add(Tiles.create(tileNumber, true));
  });
  return hand;
};
