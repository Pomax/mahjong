import { config } from "../../../config.js";
import { OptionsDialog } from "./options-dialog.js";
import { SettingsModal } from "./settings.js";
import { ScoreModal } from "./scores.js";
import { ThemeModal } from "./theming.js";
import { ColorModal } from "./colors.js";

/**
 * A modal dialog handling class. The actual dialog
 * content is written up in other files, this file
 * merely houses the code that sets up the modal
 * functionality such as show/hide and dialog stacking.
 */
class Modal {
  constructor(fixed = false) {
    this.fixed = fixed;
    this.modal = document.querySelector(".modal");
    this.gameBoard = document.querySelector(".board");
    this.panels = [];
    this.choice = new OptionsDialog(this);
    this.settings = new SettingsModal(this);
    this.theming = new ThemeModal(this);
    this.colors = new ColorModal(this);
    this.scores = new ScoreModal(this);
  }

  // show the modal stack
  reveal() {
    this.modal.classList.remove("hidden");
  }

  // is the modal stack visible?
  isHidden() {
    return this.modal.classList.contains("hidden");
  }

  // hide the modal stack
  hide() {
    this.modal.classList.add("hidden");
  }

  /**
   * Create a new modal panel to show data in.
   */
  makePanel(name) {
    let panels = this.panels;
    let panel = document.createElement("div");
    panel.classList.add("panel");
    if (name) panel.classList.add(name);
    panels.forEach((p) => (p.style.display = "none"));
    panels.push(panel);
    this.modal.appendChild(panel);
    return panel;
  }

  /**
   * Close the currently-active modal, which will either
   * reveal the underlying modal, or hide the master overlay.
   */
  close(unbind = []) {
    unbind.forEach((opt) => {
      opt.object.addEventListener(opt.evtName, opt.handler);
    });
    let modal = this.modal;
    let panels = this.panels;
    let panel = panels.pop();
    if (panel) modal.removeChild(panel);
    if (panels.length) {
      let panel = panels[panels.length - 1];
      panel.style.display = "block";
      if (panel.gainFocus) panel.gainFocus();
    } else {
      this.hide();
      this.gameBoard.focus();
    }
  }

  /**
   * TODO: merge options, values, and differs, because
   * there is no reason at all for those to not be unified.
   */
  buildPanelContent(options, wrapInForm = false) {
    const debug = config.DEBUG;

    const form = wrapInForm ? document.createElement(`form`) : undefined;
    const table = document.createElement(`table`);
    this.panels.last().append(table);

    options.forEach((entry) => {
      const { label, button_label, key, value, default_value } = entry;
      const { toggle, type, evtType, handler, debug_only } = entry;
      let options = entry.options;
      let row;

      if (!label) {
        row = document.createElement(`tr`);
        row.innerHTML = `<td colspan="2">&nbsp;</td>`;
        return table.appendChild(row);
      }

      if (debug_only && !debug) {
        return;
      }

      row = document.createElement(`tr`);
      let field = `<input class="${key} field" type"${
        type || `text`
      }" value="${value}">`;

      if (options || toggle) {
        options = toggle ? [true, false] : options;

        field = `
          <select class="${key} field">
            ${options.map(
              (opt) =>
                `<option value="${opt}"${
                  opt === value ? ` selected` : ``
                }>${`${opt}`.replace(/_/g, " ")}</option>`
            )}
          </select>`;
      }

      if (type === `file`) {
        field = `<input class="${key} picker field" type="${type}" value="pick...">`;
      }

      if (type === `button`) {
        field = `<input class="${key} picker field" type="${type}" value="${button_label}">`;
      }

      if (type === `color`) {
        field = `<input class="${key} picker field" type="${type}" value="${value.substring(
          0,
          7
        )}">`;
        if (value.length === 9) {
          // HTML5 can't do opacity natively using <input type="color">...
          field += `<input class="${key} opacity" type="range" min="0" max="255" step="1" value="${parseInt(
            value.substring(7),
            16
          )}">`;
        }
      }

      row.innerHTML = `
        <td style="white-space: nowrap;" data-toggle="${key}" ${
        toggle && !value ? `class="greyed"` : ``
      }>${label}</td>
        <td ${value != default_value ? ` class="custom"` : ``}>${field}</td>
      `;
      table.appendChild(row);

      const input = row.querySelector(`.field`);
      input.addEventListener(evtType || `input`, (evt) => {
        if (handler) {
          handler(entry, evt);
        } else {
          entry.value = evt.target.value;
        }
      });

      input.addEventListener(`input`, () => {
        console.log(input.value, default_value);
        if (input.value !== default_value.toString()) {
          input.parentNode.classList.add(`custom`);
        } else {
          input.parentNode.classList.remove(`custom`);
        }
      });


      if (toggle) {
        const inputLabel = row.querySelector(`[data-toggle="${key}"]`);
        input.addEventListener(`input`, () => inputLabel.classList.toggle(`greyed`));
      }

      // make sure we get opacity changes set over as well.
      if (type === `color`) {
        const opacity = row.querySelector(`.field + .opacity`);
        if (opacity) {
          opacity.addEventListener(`input`, (evt) => {
            handler(entry, false, evt.target.value);
          });
        }
      }
    });

    if (wrapInForm) {
      form.append(table);
      this.panels.last().append(form);
      return form;
    }

    this.panels.last().append(table);
    return table;
  }

  /**
   * Add a generic footer with an "OK" button,
   * and automated focus handling.
   */
  addFooter(panel, modalLabel = "OK", resolve = () => {}, botDismissible) {
    let ok = document.createElement("button");
    ok.textContent = modalLabel;
    ok.addEventListener("click", () => {
      this.close([
        { object: document, evntName: "focus", handler: panel.gainFocus },
      ]);
      resolve();
    });
    panel.appendChild(ok);

    // Auto-dismiss the score panel during bot play,
    // UNLESS the user interacts with the modal.
    if (config.BOT_PLAY && botDismissible) {
      let dismiss = () => ok.click();
      setTimeout(() => dismiss(), config.HAND_INTERVAL);
      panel.addEventListener("click", () => (dismiss = () => {}));
    }

    panel.gainFocus = () => ok.focus();
    document.addEventListener("focus", panel.gainFocus);

    let defaultFocus = (evt) => {
      let name = evt.target.nodeName.toLowerCase();
      if (name === "select" || name === "input") return;
      panel.gainFocus();
    };

    panel.addEventListener("click", defaultFocus);
    panel.addEventListener("touchstart", defaultFocus, { passive: true });
    panel.gainFocus();
  }

  /**
   * Offer a button dialog modal
   */
  choiceInput(label, options, resolve, cancel) {
    this.reveal();
    this.choice.show(label, options, resolve, cancel);
  }

  /**
   * Show the end-of-hand score breakdown.
   */
  setScores(hand, rules, scores, adjustments, resolve) {
    this.reveal();
    this.scores.show(hand, rules, scores, adjustments, resolve);
  }

  /**
   * Show the end-of-game score breakdown.
   */
  showFinalScores(gameui, rules, scoreHistory, resolve) {
    this.reveal();
    this.scores.showFinalScores(gameui, rules, scoreHistory, resolve);
  }

  /**
   * Show all available settings for the game.
   */
  pickPlaySettings() {
    this.reveal();
    this.settings.show();
  }

  /**
   * Show theming options for the game
   */
  pickTheming() {
    this.reveal();
    this.theming.show();
  }

  /**
   * Show theming options for the game
   */
  pickColors() {
    this.reveal();
    this.colors.show();
  }
}

let modal = new Modal();

export { modal };
