if (typeof process !== "undefined") {
  // shortcut if this wasn't our own invocation
  let path = require('path');
  let invocation = process.argv.join(' ');
  let filename = path.basename(__filename)
  if (invocation.indexOf(filename) === -1) return;

  // bootstrap the config for testing
  var config = require('../../config.js');
  config.PLAY_INTERVAL = 0;
  config.HAND_INTERVAL = 0;
  config.WRITE_GAME_LOG = true;

  let seed = 1;
  let runs = 1;

  let s = process.argv.indexOf('-s');
  if (s>0) seed = parseInt(process.argv[s+1]);

  let r = process.argv.indexOf('-r');
  if (r>0) runs = parseInt(process.argv[r+1]);

  let nw = process.argv.indexOf('-nw');
  if (nw>0) config.WRITE_GAME_LOG = false;

  let cn = process.argv.indexOf('-cn');
  if (cn>0) config.RULES = 'Cantonese';

  console.log(`\nSCRIPT WILL RECORD ${runs} GAME${runs===1?``:`S`} STARTING AT SEED=${seed}`);

  (async () => {
    for (let i=seed; i<seed+runs; i++) {
      await new Promise(resolve => {
        config.SEED = i;
        config.PRNG.seed(config.SEED);
        config.log(`Initial seed: ${config.SEED}`);

        // Play a full game!
        var GameManager = require('../core/game/game-manager.js');
        var gm = new GameManager([0,1,2,3].map(id => new BotPlayer(id)));
        var game = gm.newGame();

        game.startGame((secondsTaken) => {

          let players = game.players;
          let history = game.scoreHistory;
          const mapfn = t => config.TILE_GLYPHS[t.dataset ? t.dataset.tile : t];

          console.log();
          history.forEach((entry,hand) => {
            //console.log(`hand ${hand+1}`);
            config.log(`hand ${hand+1}`);
            entry.fullDisclosure.forEach((data,pid) => {
              let concealed = data.concealed.sort().map(mapfn).join(',');
              let locked = data.locked.map(set => set.map(mapfn)).join(', ')
              let bonus = data.bonus.map(mapfn).join(',');
              let pattern = `${concealed.length ? `${concealed} ` : ``}${locked.length ? `[${locked}] ` : ``}${bonus.length ? `(${bonus})` : ``}`;
              let message = `  ${pid} (${['E','S','W','N'][data.wind]}): ${entry.adjustments[pid]} for ${pattern}`;
              //console.log(message);
              config.log(message);
            });
          });

          console.log(`final scores:`);
          config.log(`final scores:`);

          players.forEach(p => {
            let message = `  player ${p.id}: ${p._score} (${!p.personality.chicken ? `not `: ``}set to chicken)`;
            console.log(message);
            config.log(message);
          });

          config.log(`Game took ${secondsTaken}s`);
          config.flushLog();
          resolve();
        });
      });
    }
  })();
}
