import { setStyleSheet } from "../utils.js";

class ColorModal {
  constructor(modal) {
    this.modal = modal;
    this.overrides = {};
    this.loadColorScheme();
    // TODO: update `overrides` based on the localStorage data
  }

  reset() {
    const style = document.querySelector(`style#mahjongCSS`);
    if (style) style.parentNode.removeChild(style);
  }

  saveColor(entry) {
    if (entry.value !== entry.default_value) {
      this.overrides[entry.label] = entry;
    } else {
      this.overrides[entry.label] = undefined;
    }

    const colorCSS = `:root {${Object.entries(this.overrides)
      .filter(([label, entry]) => !!entry)
      .map(([label, entry]) => `${entry.key}: ${entry.value};`)
      .join(`\n`)}}`;

    localStorage.setItem(`mahjongCSS`, colorCSS);
    setStyleSheet(`mahjongCSS`, colorCSS);
  }

  loadColorScheme() {
    const colorCSS = localStorage.getItem("mahjongCSS");
    if (colorCSS) {
      setStyleSheet(`mahjongCSS`, colorCSS);
    }
    return !!colorCSS;
  }

  /**
   * Configure all the configurable options and
   * then relaunch the game on the appropriate URL.
   */
  show() {
    const panel = this.modal.makePanel(`settings`);
    panel.innerHTML = `<h3>Change CSS Colors</h3>`;
    const options = this.getOptions(panel);
    const table = this.modal.buildPanelContent(options);
    this.addFormControls(table);
    this.modal.addFooter(panel, "Close");
  }

  addFormControls(table) {
    let row = document.createElement(`tr`);
    row.classList.add(`spacer-1`);
    row.innerHTML = `
        <td colspan="2">
          <input id="reset" type="reset" value="Reset to default settings">
        </td>
      `;
    table.appendChild(row);

    let reset = table.querySelector(`#reset`);
    reset.addEventListener("click", () => this.reset());
  }

  getCSSColors() {
    const s = Array.from(document.styleSheets).find((s) =>
      s.ownerNode.href.includes(`/colors.css`)
    );
    const colors = Array.from(s.rules[0].style);
    const colorsForHumans = colors.map((v) =>
      v.replace(/^--/, "").replaceAll("-", " ")
    );
    const values = colors.map((v) =>
      getComputedStyle(document.documentElement).getPropertyValue(v)
    );
    return { colors, colorsForHumans, values };
  }

  getOptions() {
    const colors = this.getCSSColors();
    const get = (l) => this.overrides[l]?.value;
    const hex = (c) => this.getHexColor(c);
    const save = (entry) => this.saveColor(entry);

    const options = colors.colorsForHumans.map((label, i) => {
      return {
        label: label,
        key: colors.colors[i],
        value: get(label) || hex(colors.values[i]),
        default_value: hex(colors.values[i]),
        type: `color`,
        evtType: `input`,
        get handler() {
          return (entry, evt, opacity) => {
            if (evt) this.value = hex(evt.target.value);
            if (opacity) {
              this.value =
                this.value.substring(0, 7) +
                parseInt(opacity).toString(16).padStart(2, "0");
            }
            save(this);
          };
        },
      };
    });

    return options;
  }

  getHexColor(cssColor) {
    const canvas = document.createElement(`canvas`);
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.rect(-1, -1, 2, 2);
    ctx.fillStyle = cssColor;
    ctx.fill();
    const [r, g, b, a] = Array.from(ctx.getImageData(0, 0, 1, 1).data);
    if (a < 255) {
      const v = ((r << 24) + (g << 16) + (b << 8) + a).toString(16);
      return `#${v.padStart(8, "0")}`;
    }
    const v = ((r << 16) + (g << 8) + b).toString(16);
    return `#${v.padStart(6, "0")}`;
  }
}

export { ColorModal };
