if (typeof process !== "undefined") {
    Random = require('./js/core/utils/prng.js');
}

const noop = ()=>{};
const __console_debug = console.debug.bind(console);

// This flag needs no explanation
let DEBUG = false;

// This flag also needs no explanation
let NO_SOUND = false;

// The pseudo-random number generator seed.
// This value lets us "replay" problematic
// games to find out where things go wrong.
let SEED = 0;

// The ruleset to play with.
let RULES = `Chinese Classical`;

// This determines whether you get asked to
// choose normal vs. automated play when you
// load the page.
let PLAY_IMMEDIATELY = false;

// Do not pause games when the page loses focus
let PAUSE_ON_BLUR = true;

// Debugging around drawn hands requires
// being able to force a draw
let FORCE_DRAW = false;

// This determines whether we bypass the
// separation of concern and force bots to
// update the player's ui, even though they
// normally would have no way to access it.
let FORCE_OPEN_BOT_PLAY = false;

// Highlight discarded tiles if the human
// player can claim them for something.
let SHOW_CLAIM_SUGGESTION = true;

// Work play suggestions as determined by
// the bot that underpins the human player
// into the game UI.
let SHOW_BOT_SUGGESTION = true;

// How likely are bots to go for chicken
// hands, rather than for hands worth points?
//
// Set this to 1 to turn all bots into chickens!
//
// Set this to 0 to turn off chicken hands
// (except when a bot goes into panic mode).
//
// Defaults to a roughly 1:72 chance to
// chicken. Note that once panic mode sets in,
// this value doubles with each check.
let BOT_CHICKEN_THRESHOLD = 0.0008;

// The number of milliseconds the game
// allows players to lay claim to a discard.
// Bots need nowhere near this much, but
// humans tend to need more than a few ms!
let CLAIM_INTERVAL = 5000;

// The number of milliseconds between
// players taking their turn.
let PLAY_INTERVAL = 100;

// The number of milliseconds pause
// between playing "hands".
let HAND_INTERVAL = 3000;

// The number of milliseconds that
// the bots will wait before putting
// in their claim for a discard.
// If this is 0, humans feel like they
// are playing bots. Which they are.
// But if this is a few hundred ms,
// game play "Feel" more natural.
let BOT_DELAY_BEFORE_DISCARD_ENDS = 300;

// Turning on wall hacks will set the wall
// to very specific walls for debugging
// purposes. This option simple fixes the
// wall to a pattern on reset() so you can't
// play a game if you use this. You just
// get to debug a very specific situation.
let WALL_HACK = '';

// Write the game log to disk, or to a new
// tab as a text file.
let WRITE_GAME_LOG = false;

const DEFAULTS = {
    DEBUG,
    NO_SOUND,
    SEED,
    RULES,
    PLAY_IMMEDIATELY,
    PAUSE_ON_BLUR,
    FORCE_DRAW,
    FORCE_OPEN_BOT_PLAY,
    SHOW_CLAIM_SUGGESTION,
    SHOW_BOT_SUGGESTION,
    BOT_CHICKEN_THRESHOLD,
    PLAY_INTERVAL,
    HAND_INTERVAL,
    BOT_DELAY_BEFORE_DISCARD_ENDS,
    WALL_HACK,
    WRITE_GAME_LOG,
};

// runtime overrides?
if (typeof window !== "undefined") {
    let params = new URLSearchParams(window.location.search.replace(/(\w+)=/g, (a,b) => b.toUpperCase() + '='));

    DEBUG = (params.get(`DEBUG`)==='true') ? true : DEBUG;
    NO_SOUND = (params.get(`NO_SOUND`)==='true') ? true : NO_SOUND;
    SEED = params.get(`SEED`) ? parseInt(params.get(`SEED`)) : SEED;
    RULES = params.get(`RULES`) ? params.get(`RULES`) : RULES;
    PLAY_IMMEDIATELY = (params.get(`PLAY_IMMEDIATELY`)==='true') ? true : PLAY_IMMEDIATELY;
    PAUSE_ON_BLUR = (params.get(`PAUSE_ON_BLUR`)==='false') ? false: PAUSE_ON_BLUR;
    FORCE_DRAW = (params.get(`FORCE_DRAW`)==='true') ? true : FORCE_DRAW;
    FORCE_OPEN_BOT_PLAY = (params.get(`FORCE_OPEN_BOT_PLAY`)==='true') ? true : FORCE_OPEN_BOT_PLAY;
    SHOW_CLAIM_SUGGESTION = (params.get(`SHOW_CLAIM_SUGGESTION`)==='true') ? true : SHOW_CLAIM_SUGGESTION;
    SHOW_BOT_SUGGESTION = (params.get(`SHOW_BOT_SUGGESTION`)==='true') ? true : SHOW_BOT_SUGGESTION;
    BOT_CHICKEN_THRESHOLD = params.get(`BOT_CHICKEN_THRESHOLD`) ? parseFloat(params.get(`BOT_CHICKEN_THRESHOLD`)) : BOT_CHICKEN_THRESHOLD;
    PLAY_INTERVAL = params.get(`PLAY_INTERVAL`) ? parseInt(params.get(`PLAY_INTERVAL`)) : PLAY_INTERVAL;
    HAND_INTERVAL = params.get(`HAND_INTERVAL`) ? parseInt(params.get(`HAND_INTERVAL`)) : HAND_INTERVAL;
    BOT_DELAY_BEFORE_DISCARD_ENDS = params.get(`BOT_DELAY_BEFORE_DISCARD_ENDS`) ? parseInt(params.get(`BOT_DELAY`)) : BOT_DELAY_BEFORE_DISCARD_ENDS;
    WALL_HACK = params.get(`WALL_HACK`) ? params.get(`WALL_HACK`) : WALL_HACK;
    WRITE_GAME_LOG = (params.get(`WRITE_GAME_LOG`)==='true') ? true : WRITE_GAME_LOG;
}

console.log(`using bot threshold ${BOT_CHICKEN_THRESHOLD}`);

if (WALL_HACK || PLAY_IMMEDIATELY) {
    FORCE_OPEN_BOT_PLAY = true;
    NO_SOUND = true;
}

// The simple config is for settings I
// personally change a lot during development.
const simple = {

};

// Constants used during play, for determining
// claim types on discarded tiles.
const CLAIM = {
    IGNORE: 0,
    PAIR: 1,
    CHOW: 2,
    CHOW1: 4, // first tile in pattern: X**
    CHOW2: 5, // middle tile in pattern: *X*
    CHOW3: 6, // last time in pattern: **X
    PUNG: 8,
    KONG: 16,
    SET: 30, // masks 0b.0001.1110
    WIN: 32,
};


// This is a legacy list and needs to just be
// removed from the game code, with "CLAIM"
// getting renamed to something more general.
const Constants = {
    PAIR: CLAIM.PAIR,
    CHOW: CLAIM.CHOW,
    CHOW1: CLAIM.CHOW1,
    CHOW2: CLAIM.CHOW2,
    CHOW3: CLAIM.CHOW3,
    PUNG: CLAIM.PUNG,
    KONG: CLAIM.KONG,
    SET: CLAIM.SET,
    WIN: CLAIM.WIN
};


// Tile names...
const TILE_NAMES = {
     "0": 'bamboo 1',
     "1": 'bamboo 2',
     "2": 'bamboo 3',
     "3": 'bamboo 4',
     "4": 'bamboo 5',
     "5": 'bamboo 6',
     "6": 'bamboo 7',
     "7": 'bamboo 8',
     "8": 'bamboo 9',
     "9": 'characters 1',
    "10": 'characters 2',
    "11": 'characters 3',
    "12": 'characters 4',
    "13": 'characters 5',
    "14": 'characters 6',
    "15": 'characters 7',
    "16": 'characters 8',
    "17": 'characters 9',
    "18": 'dots 1',
    "19": 'dots 2',
    "20": 'dots 3',
    "21": 'dots 4',
    "22": 'dots 5',
    "23": 'dots 6',
    "24": 'dots 7',
    "25": 'dots 8',
    "26": 'dots 9',
    "27": 'east',
    "28": 'south',
    "29": 'west',
    "30": 'north',
    "31": 'green dragon',
    "32": 'red dragon',
    "33": 'white dragon',
    "34": 'flower 1',
    "35": 'flower 2',
    "36": 'flower 3',
    "37": 'flower 4',
    "38": 'season 1',
    "39": 'season 2',
    "40": 'season 3',
    "41": 'season 4'
};

const TILE_GLYPHS = {
     "0": 'b1', // '🀐',
     "1": 'b2', // '🀑',
     "2": 'b3', // '🀒',
     "3": 'b4', // '🀓',
     "4": 'b5', // '🀔',
     "5": 'b6', // '🀕',
     "6": 'b7', // '🀖',
     "7": 'b8', // '🀗',
     "8": 'b9', // '🀘',
     "9": 'c1', // '🀇',
    "10": 'c2', // '🀈',
    "11": 'c3', // '🀉',
    "12": 'c4', // '🀊',
    "13": 'c5', // '🀋',
    "14": 'c6', // '🀌',
    "15": 'c7', // '🀍',
    "16": 'c8', // '🀎',
    "17": 'c9', // '🀏',
    "18": 'd1', // '🀙',
    "19": 'd2', // '🀚',
    "20": 'd3', // '🀛',
    "21": 'd4', // '🀜',
    "22": 'd5', // '🀝',
    "23": 'd6', // '🀞',
    "24": 'd7', // '🀟',
    "25": 'd8', // '🀠',
    "26": 'd9', // '🀡',
    "27": 'E',  // '🀀',
    "28": 'S',  // '🀁',
    "29": 'W',  // '🀂',
    "30": 'N',  // '🀃',
    "31": 'F',  // '🀅',
    "32": 'C',  // '🀄',
    "33": 'P',  // '🀆',
    "34": 'f1', // '🀢',
    "35": 'f2', // '🀣',
    "36": 'f3', // '🀤',
    "37": 'f4', // '🀥',
    "38": 's1', // '🀦',
    "39": 's2', // '🀧',
    "40": 's3', // '🀨',
    "41": 's4', // '🀩'
};

const SUIT_NAMES = {
    "0": "bamboo",
    "1": "characters",
    "2": "dots",
    "3": "winds",
    "4": "dragons",
    "5": "bonus"
};

// And then rest of the configuration.
const config = {
    set: opt => {
        Object.keys(opt).forEach(key => {
            let value = opt[key];
            if (typeof config[key] !== "undefined") {
                config[key] = value;
                if (key === `DEBUG`) {
                    if (value) {
                        console.log('activating');
                        console.debug = __console_debug;
                    } else {
                        console.log('deactivating');
                        console.debug = noop;
                    }
                }
            }
        })
    },

    DEFAULTS,

    // The pseudo-random number generator used by
    // any code that needs to randomise data.
    PRNG: new Random(SEED),
    DEBUG,
    log: noop,
    flushLog: noop,
    NO_SOUND,
    SEED,
    RULES,
    PLAY_IMMEDIATELY,
    PAUSE_ON_BLUR,
    FORCE_DRAW,
    FORCE_OPEN_BOT_PLAY,
    SHOW_CLAIM_SUGGESTION,
    SHOW_BOT_SUGGESTION,
    BOT_CHICKEN_THRESHOLD,
    WALL_HACK,
    WRITE_GAME_LOG,

    CLAIM_INTERVAL,
    PLAY_INTERVAL,
    HAND_INTERVAL,

    // For debugging purposes, if we're messing
    // with which hand/draw it is, we need to
    // probably also peg the PRNG seed.
    START_OVERRIDE_SEED: 0,

    // For debugging purposes, we can tell
    // the game to effectively start on a
    // hand other than hand 1.
    START_ON_HAND: 0,

    // For debugging purposes, we can tell
    // the game to effectively pause play
    // at the end of the following "hand".
    // A value of 0 means "don't pause".
    PAUSE_ON_HAND: 0,

    // For debugging purposes, we prespecify
    // the number of draws.
    START_ON_DRAWS: 0,

    // For debugging purposes, we can tell
    // the game to effectively pause play
    // at the end of the following "draw".
    // A value of 0 means "don't pause".
    PAUSE_ON_DRAW: 0,

    // For debugging purposes, we can tell
    // the game to pause play after a specific
    // tile getting dealt during a hand.
    // A value of 0 means "don't pause".
    PAUSE_ON_PLAY: 0,

    // This setting determines which type of play
    // is initiated if PLAY_IMMEDIATELY is true
    BOT_PLAY: true,
    BOT_DELAY_BEFORE_DISCARD_ENDS,

    // This value determines how long bots will
    // "wait" before discarding a tile. This is
    // a purely cosmetic UX thing, where humans
    // enjoy a game more if it doesn't feel like
    // they're playing against perfect machines.
    // We're weird that way.
    ARTIFICIAL_BOT_DELAY: 300,

    // Determine whether we award points based on
    // the losers paying the winner, or the losers
    // also paying each other.
    //
    // Note that this is purely a fallback value,
    // and rulesets should specify this instead.
    LOSERS_SETTLE_SCORES: true,

    // See above
    CLAIM,

    // See above
    Constants,

    // See above
    TILE_NAMES,
    TILE_GLYPHS,
    SUIT_NAMES,

    // A conversion function for turning computer
    // chow differences into claim types. This will
    // probably be migrated to somewhere else soon.
    convertSubtypeToClaim: (diff) => {
        if(diff === -1) return CLAIM.CHOW3;
        if(diff === 1) return CLAIM.CHOW2;
        if(diff === 2) return CLAIM.CHOW1;
        return diff;
    }
};

// bind console.debug correctly.
config.set({ DEBUG });

// in node context?
if (typeof process !== "undefined") {
    module.exports = config;
    playlog = require('./js/core/utils/logger.js');
}

config.log = playlog.log;
config.flushLog = playlog.flush;
