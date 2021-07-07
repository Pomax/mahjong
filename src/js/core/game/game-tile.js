import { TILE_NAMES } from "../../../config.js";

class GameTile extends HTMLElement {
  constructor(tile) {
    super();
    tile = tile ?? this.getAttribute(`tile`) ?? -1;
    this.values = { tile };
    this.setAttribute(`tile`, this.values.tile);
    this.setAttribute(`title`, TILE_NAMES[tile]);
    this.setAttribute(`alt`, TILE_NAMES[tile]);
  }

  static get observedAttributes() {
    return [
      `bonus`,
      `tile`,
      `locked`,
      `locknum`,
      `hidden`,
      `concealed`,
      `supplement`,
    ];
  }

  attributeChangedCallback(attr, oldVal, newVal) {
    if (oldVal === newVal) return;
    this.onChange(attr, newVal);
  }

  onChange(attributeName, attributeValue) {
    // Is this a boolean value?
    let asBool = new Boolean(attributeValue).toString();
    if (attributeValue == asBool) {
      return (this.values[attributeName] = asBool);
    }
    // Maybe it's a number?
    let asInt = parseInt(attributeValue);
    if (attributeValue == asInt) {
      return (this.values[attributeName] = asInt);
    }
    let asFloat = parseFloat(attributeValue);
    if (attributeValue == asFloat) {
      return (this.values[attributeName] = asFloat);
    }
    // Okay fine, it's a string.
    this.values[attributeName] = attributeValue;
  }

  // TODO: refactor these two functions out of existence
  mark(...labels) {
    labels.forEach((label) => this.classList.add(label));
  }
  unmark(...labels) {
    labels.forEach((label) => this.classList.remove(label));
  }
  // TODO: refactor these two functions out of existence

  getFrom() {
    return this.values.from;
  }
  setFrom(pid) {
    this.setAttribute(`from`, pid);
  }

  setTitle(title = false) {
    if (title) {
      this.setAttribute(`title`, title);
    } else {
      this.removeAttribute(`title`);
    }
  }

  hide() {
    this.setAttribute(`hidden`, true);
  }
  isHidden() {
    return this.values.hidden;
  }
  reveal() {
    this.removeAttribute(`hidden`);
  }

  conceal() {
    this.setAttribute(`concealed`, true);
  }
  isConcealed() {
    return this.values.concealed;
  }
  unconceal() {
    this.removeAttribute(`concealed`);
  }

  winning() {
    this.setAttribute(`winning`, true);
  }
  isWinningTile() {
    return this.values.winning;
  }

  lock(locknum) {
    this.setAttribute(`locked`, true);
    if (locknum) {
      this.setAttribute(`locknum`, locknum);
    }
  }

  meld() {
    this.setAttribute(`meld`, true);
  }
  isLocked() {
    return this.values.locked;
  }
  getLockNumber() {
    return this.values.locknum;
  }
  unlock() {
    this.removeAttribute(`locked`);
    this.removeAttribute(`locknum`);
  }

  bonus() {
    this.setAttribute(`bonus`, true);
    this.lock();
  }
  isBonus() {
    return this.values.bonus;
  }

  supplement() {
    this.setAttribute(`supplement`, true);
  }
  isSupplement() {
    return this.values.supplement;
  }

  setTileFace(tile) {
    this.setAttribute(`tile`, tile);
  }
  getTileFace() {
    return this.values.tile;
  }
  getTileSuit() {
    let num = this.getTileFace();
    if (num < 9) return 0;
    if (num < 18) return 1;
    if (num < 27) return 2;
    if (num < 30) return 3;
    return 4;
  }

  valueOf() {
    return this.values.tile;
  }

  toString() {
    return `GameTile(${this.values.tile})`;
  }
}

globalThis.customElements.define(`game-tile`, GameTile);

/**
 * Register all tiles
 */
function declare(label, tilenumber) {
  globalThis.customElements.define(
    label,
    class extends GameTile {
      constructor() {
        super(tilenumber);
      }
    }
  );
}

const numeral = [
  `one`,
  `two`,
  `three`,
  `four`,
  `five`,
  `six`,
  `seven`,
  `eight`,
  `nine`,
];
let tilenumber = 0;
[`bamboo`, `characters`, `dots`].forEach((suit) =>
  numeral.forEach((number) => declare(`${suit}-${number}`, tilenumber++))
);
declare(`east-wind`, 27);
declare(`south-wind`, 28);
declare(`west-wind`, 29);
declare(`north-wind`, 30);
declare(`green-dragon`, 31);
declare(`red-dragon`, 32);
declare(`white-dragon`, 33);
tilenumber = 34;
[`flower`, `season`].forEach((b) =>
  numeral
    .slice(0, 4)
    .forEach((number) => declare(`${b}-${number}`, tilenumber++))
);

/**
 * Create a <span data-tile=`...`></span> element
 * from a specified tile number. Also, because it's
 * such a frequent need, this adds a `getTileFace()`
 * function to the span itself.
 */
const create = (tileNumber, hidden) => {
  let span;

  if (typeof process !== `undefined`) {
    span = new GameTile(tileNumber);
  } else {
    let GameTile = customElements.get(`game-tile`);
    span = new GameTile(tileNumber);
  }

  if (tileNumber < 34) {
    if (hidden) {
      span.hide();
    }
  } else span.bonus();

  return span;
};

export { create, GameTile };
