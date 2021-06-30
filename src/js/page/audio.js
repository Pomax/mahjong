import { config } from "../../config.js";
import { random } from "../core/utils/math.js";

const filenames = {
  thud: [
    `play-01.mp3`,
    `play-02.mp3`,
    `play-03.mp3`,
    `play-04.mp3`,
    `play-05.mp3`,
    `play-06.mp3`,
    `play-07.mp3`,
  ],

  click: [
    `click-01.mp3`,
    `click-02.mp3`,
    `click-03.mp3`,
    `click2-01.mp3`,
    `click2-02.mp3`,
  ],

  multi: [`click-multi-01.mp3`, `click-multi-02.mp3`, `click-multi-03.mp3`],

  kong: [`click-multi-large-01.mp3`, `click-multi-large-02.mp3`],

  start: [`start.mp3`],
  win: [`win.mp3`],
  draw: [`draw.mp3`],
  end: [`end.mp3`],
};

// turn filenames into playable clips:
const buildBin = (filename) => {
  let audio = document.createElement("audio");
  audio.src = `audio/${filename}`;
  audio.type = `mp3`;
  return audio;
};

const clips = {};

Object.keys(filenames).forEach(
  (bin) => (clips[bin] = filenames[bin].map(buildBin))
);

/**
 * play a random clip from the specified named bin,
 * if `id` is falsey. Otherwise, play that specific
 * clip.
 */
function playClip(name, id) {
  if (!config.USE_SOUND) return;

  let bin = clips[name];
  if (!bin) {
    return console.error(`audio bin ${name} does not exist`);
  }

  let pos = id || random(bin.length);
  let audio = bin[pos];
  if (!audio) {
    return console.error(`audio bin ${name} does not have a clip ${pos}`);
  }

  audio.cloneNode().play();

  // cloneNode is used here to make sure that the same
  // clip can be played "while it is already playing",
  // e.g. a randomised tile play a sound that happens to
  // pick the same clip in the sequence should not "cut
  // off" playback of that same file.
}

export { playClip };
