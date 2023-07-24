/**
 * This file contains a bunch of "virtual key" definitions,
 * that specify which key codes map to a specific virtual
 * interpretation. For example, the "left" action can be
 * represented by both the left cursor key, but also the
 * 'a' key, for those who are used to WASD controls.
 */

const VK_LEFT = {
  "37": true, // left cursor
  "65": true  // 'a' key
};

const VK_RIGHT = {
  "39": true, // right cursor
  "68": true  // 'd' key
};

const VK_UP = {
  "38": true, // up cursor
  "87": true  // 'w' key
};

const VK_DOWN = {
  "40": true, // down cursor
  "83": true  // 's' key
};

const VK_START = {
  "36": true // home
};

const VK_END = {
  "35": true // end
};

const VK_SIGNAL = {
  "13": true, // enter
  "32": true  // space
};

/**
 * In addition to the key maps, we also need to
 * make sure we put in the signal lock to prevent
 * OS/application-level key-repeat from incorrectly
 * triggering events:
 */

let vk_signal_lock = false;

function lock_vk_signal() {
  vk_signal_lock = true;
  document.addEventListener('keyup', unlock_vk_signal);
};

function unlock_vk_signal(evt) {
  let code = evt.keyCode;
  if (VK_UP[code] || VK_SIGNAL[code]) {
    vk_signal_lock = false;
    document.removeEventListener('keyup', unlock_vk_signal);
  }
};

export {
  vk_signal_lock,
  lock_vk_signal,
  unlock_vk_signal,
  VK_LEFT,
  VK_RIGHT,
  VK_UP,
  VK_DOWN,
  VK_START,
  VK_END,
  VK_SIGNAL
};
