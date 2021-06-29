import { VK_UP, VK_DOWN, VK_START, VK_END } from "../virtual-keys.js";

class OptionsDialog {
  constructor(modal) {
      this.modal = modal;
  }

  /**
   * This modal offers a label and a set of button choices
   * to pick from. Buttons can be navigated with the
   * cursor keys for one handed play.
   */
  show(label, options, resolve, cancel)  {
    let panel = this.modal.makePanel();
    if (options.fixed) panel.fixed = true;
  panel.innerHTML = `<h1>${label}</h1>`;

    let bid = 0;
    let btns = [];

    options.filter(v=>v).forEach(data => {
      if (Object.keys(data).length===0) {
        return panel.appendChild(document.createElement('br'));
      }

      if (data.heading) {
        let heading = document.createElement('h1');
        heading.textContent = data.heading;
        return panel.appendChild(heading);
      }

      if (data.description) {
        let description = document.createElement('p');
        if (data.align) description.classList.add(data.align);
        description.textContent = data.description;
        return panel.appendChild(description);
      }

      let btn = document.createElement("button");
      btn.textContent = data.label;

      btn.addEventListener("click", e => {
        e.stopPropagation();
        if (!data.back) this.modal.close([{ object:this.modal.gameBoard, evntName:'focus', handler: panel.gainFocus }]);
        resolve(data.value);
      });

      btn.addEventListener("keydown", e => {
        e.stopPropagation();
        let code = e.keyCode;
        let willBeHandled = (VK_UP[code] || VK_DOWN[code] || VK_START[code] || VK_END[code]);
        if (!willBeHandled) return;
        e.preventDefault();
        if (VK_UP[code]) bid = (bid===0) ? btns.length - 1 : bid - 1;
        if (VK_DOWN[code]) bid = (bid===btns.length - 1) ? 0 : bid + 1;
        if (VK_START[code]) bid = 0;
        if (VK_END[code]) bid = btns.length - 1;
        btns[bid].focus();
      });

      panel.appendChild(btn);
    });

    if (cancel) {
      let handleKey = evt => {
        if (evt.keyCode === 27) {
          evt.preventDefault();
          this.modal.close([
            { object:document, evntName:'focus', handler: panel.gainFocus },
            { object:this.modal.gameBoard, evntName:'keydown', handler: handleKey },
          ]);
          cancel();
        }
      }
      this.modal.gameBoard.addEventListener('keydown', handleKey);
    }

    btns = panel.querySelectorAll(`button`);
    panel.gainFocus = () => btns[bid].focus();
    document.addEventListener('focus', panel.gainFocus);
    panel.addEventListener('click', panel.gainFocus);
    panel.addEventListener('touchstart', panel.gainFocus, {passive: true});
    panel.gainFocus();
  }
}

export { OptionsDialog };
