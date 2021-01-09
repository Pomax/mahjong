if (typeof process !== "undefined") {
  OptionsDialog = require('./options-dialog.js');
  SettingsModal = require('./settings.js');
  ScoreModal = require('./scores.js');
}


/**
 * A modal dialog handling class. The actual dialog
 * content is written up in other files, this file
 * merely houses the code that sets up the modal
 * functionality such as show/hide and dialog stacking.
 */
class Modal {
  constructor() {
    this.modal = document.querySelector(".modal");
    this.gameBoard = document.querySelector('.board');
    this.panels = [];
    this.choice = new OptionsDialog(this);
    this.settings = new SettingsModal(this);
    this.scores = new ScoreModal(this);
  }

  // show the modal stack
  reveal() { this.modal.classList.remove("hidden"); }

  // is the modal stack visible?
  isHidden() { return this.modal.classList.contains('hidden'); }

  // hide the modal stack
  hide() { this.modal.classList.add("hidden"); }

  /**
   * Create a new modal panel to show data in.
   */
  makePanel (name) {
    let panels = this.panels;
    let panel = document.createElement("div");
    panel.classList.add("panel");
    if (name) panel.classList.add(name);
    panels.forEach(p => (p.style.display = "none"));
    panels.push(panel);
    this.modal.appendChild(panel);
    return panel;
  }

  /**
   * Close the currently-active modal, which will either
   * reveal the underlying modal, or hide the master overlay.
   */
  close(unbind=[]) {
    unbind.forEach(opt => {
      opt.object.addEventListener(opt.evtName, opt.handler);
    });
    let modal = this.modal;
    let panels = this.panels;
    let panel = panels.pop();
    if (panel) modal.removeChild(panel);
    if (panels.length) {
      let panel = panels[panels.length - 1]
      panel.style.display = "block";
      if (panel.gainFocus) panel.gainFocus();
    }
    else {
      this.hide();
      this.gameBoard.focus();
    }
  }

  /**
   * Add a generic footer with an "OK" button,
   * and automated focus handling.
   */
  addFooter(panel, modalLabel="OK", resolve=(()=>{}), botDismissible) {
    let ok = document.createElement('button');
    ok.textContent = modalLabel;
    ok.addEventListener('click', () => {
      this.close([{ object:document, evntName:'focus', handler: panel.gainFocus }]);
      resolve();
    });
    panel.appendChild(ok);

    // Auto-dismiss the score panel during bot play,
    // UNLESS the user interacts with the modal.
    if(config.BOT_PLAY && botDismissible) {
      let dismiss = () => ok.click();
      setTimeout(() => dismiss(), config.HAND_INTERVAL);
      panel.addEventListener('click', () => dismiss = () => {});
    }

    panel.gainFocus = () => ok.focus();
    document.addEventListener('focus', panel.gainFocus);

    let defaultFocus = evt => {
      let name = evt.target.nodeName.toLowerCase();
      if (name === 'select' || name === 'input') return;
      panel.gainFocus();
    };

    panel.addEventListener('click', defaultFocus);
    panel.addEventListener('touchstart', defaultFocus, {passive:true});
    panel.gainFocus();
  }

  /**
   * Offer a button dialog modal
   */
  choiceInput(label, options, resolve, cancel)  {
    this.reveal();
    this.choice.show(label, options, resolve, cancel);
  }

  /**
   * Show the end-of-hand score breakdown.
   */
  setScores(hand, rules, scores, adjustments, resolve) {
    this.reveal()
    this.scores.show(hand, rules, scores, adjustments, resolve);
  };

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
    this.reveal()
    this.settings.show();
  }
}

let modal = new Modal();

if (typeof process !== "undefined") {
  module.exports = modal;
}
