/**
  CHINESE CLASSICAL RULES

  - starting points: 2000
  - limit per hand: 1000

  TILE POINTS:

    multipliers :

      own flower + season:     1
      all flowers or seasons:  1
      all flowers and seasons: 3

    multiplier hands:

      little winds: 1    three pung/kong and a pair of winds, any other pung/kong
      big winds:    5    pung/kongs of all winds, any other pair

  WINNING HAND ONLY:

    winning:         10
    self drawn:      10
    one chance hand:  2
    out on a pair:    2

    multipliers :

      out on the last tile:           1
      out on the last discard:        1
      out on a supplement tile:       1
      out by robbing a kong:          1
      ready to win on first turn:     1

    limit hands:

      heavenly hand      100%    East, going out on the dealt hand.
      earthly hand       100%    Not east, going out on east's first discard.

      all kong           100%
      all honors         100%
      all terminal       100%

      kong on kong         100%    Out on dead wall tile from a second kong that turn.
      13 wins              100%    13 wins as dealer.
      all green            100%    Normal hand with only-green bamboo tiles (2,3,4,6,8) and/or green dragons.
      three scholars       100%    Pungs of all three dragons, random pung and a pair.
      nine gates           100%    Same suit 111, 2345678, 999, using any one numeral to complete - concealed, final may be drawn.
      nine gates impure    100%    Same suit 111, 2345678, 999, any one numeral to complete, completed by forming the gate pattern instead.
      squirming snake      100%    111, 234, 567, 88, 999 one suit - allowed to meld.
      fully conceal suit   100%    All tiles from one suit, no honors.
      thirteen orphans     100%    1,9 of each suit, n,e,s,w,c,f,p and any of these to complete.
      hidden treasure      100%    Fully concealed pung/kong hand - cannot be formed with a discard.

      moon from bottom of the ocean   100%  Last tile/last discard, dots 1.
      plum blossom from the roof      100%  Out on dead wall tile, dots 5.
      cat scratching a carier pole    100%  Out by robbing kong, bamboo 2.

  Score settling:

    Everyone pays the winner the number of tilepoints the winner had.
      - East pays double, or if the winner is east, receives double from everyone

    The losers pay each other the difference in their points
      - If east did not win, east pays and receives double


  Punishments:

    - 9 tile error applies
 */
var ChineseClassical = function() {};

ChineseClassical.prototype = {
  limit: 1000,
  start: 2000,
  init: function(players) {
    players.forEach(function(player) {
      player.score = this.start;
    });
  },
  score: function(players, winner, roundwind) {
    players.forEach(function(player) {
      var won = player === winner;
      var score = 0;
      score += this.calculateBasicTilepoints(player, roundwind, won);
      score *= Math.pow(2, this.calculateDoubles(player, roundwind, won));
      if(score > this.limit) { score = this.limit; }
      player.hand.score = score;
    });
  },
  calculateBasicTilepoints: function(player, roundwind, won) {
    var points = 0;
    if (won) { points = 10; }
    player.hand.concealed.getSets().forEach(function(set) {
      points += BasicTilePoints.getPoints(set, true);
    });
    player.hand.declared.getSets().forEach(function(set) {
      points += BasicTilePoints.getPoints(set, false);
    });
    player.hand.bonus.getTiles().forEach(function(tile) {
      points += BasicTilePoints.getBonusPoints(tile);
    });
    // special winning conditions
    if (won) {
      if (player.hand.selfDraw) { points += 2; }
      if (player.hand.onlyout) { points += 2; }
      if (player.outonpair) { points += 2; }
      if (player.outonmajorpair) { points += 2; }
    }
    return points;
  },
  calculateDoubles: function(player, roundwind, won) {
    var doubles = 0,
        fullyconcealed = player.hand.declared.getSets().length > 0,
        clean = player.hand.clean,
        chow = player.hand.onlyChow,
        pung = player.hand.onlyPung,
        winds = player.hand.onlyWinds,
        honors = player.hand.onlyHonors,
        sets = player.hand.concealed.getSets().concat(player.hand.declared.getSets()),
        windCount = 0,
        windPungCount = 0;
    sets.forEach(function(set) {
      if (set.isPung() || set.isKong()) {
        if(Tiles.isDragon(set.tile[0]) ) { doubles += 1; }
        else if(roundwind.tileNumber === set.tile[0].tileNumber) { doubles += 1; }
        else if(player.wind.tileNumber === set.tile[0].tileNumber) { doubles += 1; }
        if (Tiles.isWind(set.tile[0])) { windPungCount++; }
      }
      if (!set.isChow() && Tiles.isWind(set.tile[0])) {
        windCount++;
      }
    });

    if(windCount>2) {
      if(windPungCount>3) { doubles += 5; }
      else { doubles += 1; }
    }

    // TODO: bonus tiles

    if (won) {
      if (fullyconcealed)     { doubles += 1; }
      if (chow)               { doubles += 1; }
      if (pung)               { doubles += 1; }
      if (clean)              { doubles += 3; }
      if (cleanWithHonors)    { doubles += 1; }
      if (player.lasttile)    { doubles += 1; }
      if (player.lastdiscard) { doubles += 1; }
      if (player.supplement)  { doubles += 1; }
      if (player.kongrob)     { doubles += 1; }
      if (player.readyOnFirst){ doubles += 1; }
    }

    return doubles;
  }
};

/*

  // settle the payment to the winner, and payment amongst the rest
  function settle_scores(&$roundinfo) {
    $showscores = false;
    global $start_score;

    $roundinfo["scoring"][] = "settling scores";

    // first settle payment to the winner
    $winner = $roundinfo["winner"];
    $winplayer =& $roundinfo["players"][$winner];

    // check for nine-tile error made by someone
    if($roundinfo["ninetile"] !== false)
    {
      // this player pays for everyone!
      $seriousloser =& $roundinfo["players"][$roundinfo["ninetile"]];
      $factor = ($winplayer["wind"] == "東" || $player["wind"] == "東") ? 2 : 1;
      $difference = 3 * $factor * $winplayer["tilepoints"];

      $winplayer["score"] += $difference;
      $seriousloser["score"] -= $difference;
      $seriousloser["scoring"][] = "<br/><b><i>pays winner for everyone,<br/>due to nine tile error</i></b>";
    }
    elseif($roundinfo["wrongful"] !== false)
    {
      // this player pays 300 to all players
      $seriousloser =& $roundinfo["players"][$roundinfo["wrongful"]];
      for($i=0;$i<4;$i++) {
        if($i!=$roundinfo["wrongful"]) {
          $roundinfo["players"][$i]["score"] += 300;
          $roundinfo["players"][$i]["scoring"] = "<br/><b>wrongful out points</b>"; }}
      $roundinfo["players"][$roundinfo["wrongful"]]["score"] -= 900;
    }
    else
    {
      // without a nine tile error, all players pay the winner
      for($p=0;$p<4;$p++) {
        $player =& $roundinfo["players"][$p];
        if ($p != $winner) {
          $factor = ($winplayer["wind"] == "東" || $player["wind"] == "東") ? 2 : 1;
          $difference = $factor * $winplayer["tilepoints"];
          $roundinfo["scoring"][] = $player["name"]."(".$player["wind"].") pays ".$winplayer["name"]." (".$winplayer["wind"]."): ".$difference."";

          $winplayer["score"] += $difference;
          $player["score"] -= $difference; } }
    }

    // next, settle payment amongst the losers
    if($roundinfo["wrongful"] === false) {
      for($p1=0;$p1<4;$p1++) {
        for($p2=$p1+1;$p2<4;$p2++) {
          $player1 =& $roundinfo["players"][$p1];
          $player2 =& $roundinfo["players"][$p2];
          $factor = ($player1["wind"] == "東" || $player2["wind"] == "東") ? 2 : 1;
          if ($p1 == $winner || $p2 == $winner) { continue; }
          else {
            $difference = $factor * ($player1["tilepoints"] - $player2["tilepoints"]);
            $roundinfo["scoring"][] = $player2["name"]."(".$player2["wind"].") pays ".$player1["name"]."(".$player1["wind"]."): ". $difference."";
            $player1["score"] += $difference;
            $player2["score"] -= $difference; } } } }

    // change points based on the score
    $scores =& $roundinfo["scores"];
    $points =& $roundinfo["points"];
    for($i=0;$i<4;$i++) {
      $scores[$i][] = $roundinfo["players"][$i]["score"];
      $points[$i][] = $points[$i][count($points[$i])-1] + $roundinfo["players"][$i]["score"]; }
  }



  // update the winds if the deal passed and the winner was not east, and the wotr if wind was 北 and east did not win.
  function update_winds(&$roundinfo) {
    $winnerwind = $roundinfo["players"][$roundinfo["winner"]]["wind"];
    if($winnerwind != "東" || $roundinfo["wrongful"] !== false) {
      // rotate wind of the round
      $wotr = $roundinfo["wotr"];
      if ($roundinfo["players"][3]["wind"] == "東") {
        switch($wotr) {
          case("東") : $roundinfo["wotr"] = "南"; break;
          case("南") : $roundinfo["wotr"] = "西"; break;
          case("西") : $roundinfo["wotr"] = "北"; break;
          case("北") : $roundinfo["wotr"] = "done"; break; } }

      // rotate player winds
      for($i=0;$i<4;$i++) {
        $wind = $roundinfo["winds"][$i];
        switch($wind) {
          case("東") : $roundinfo["winds"][$i] = "北"; break;
          case("南") : $roundinfo["winds"][$i] = "東"; break;
          case("西") : $roundinfo["winds"][$i] = "南"; break;
          case("北") : $roundinfo["winds"][$i] = "西"; break; } } }
  }
*/
