import { setStyleSheet, TileSetManager } from "../utils.js";

function fileLoader(evt) {
  return new Promise((resolve, reject) => {
    const file = evt.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        file.dataURL = e.target.result;
        if (file.size > 500000) {
          alert("Images over 500kb are not supported");
          return reject();
        }
        resolve(file);
      };
      reader.readAsDataURL(file);
    } else reject();
  });
}

class ThemeModal {
  constructor(modal) {
    this.modal = modal;
    this.init();
  }

  init() {
    this.loadBackground();
    this.loadSidebar();
    this.loadPlayerBanks();
    this.loadTileset();
  }

  reset() {
    [
      `mahjongBackground`,
      `mahjongSidebar`,
      `mahjongPlayerBanks`,
      `mahjongTileset`,
      `mahjongCSS`,
    ].forEach((key) => {
      localStorage.removeItem(key);
      const e = document.getElementById(`mahjongBackground`);
      if (e) {
        e.parentNode.removeChild(e);
      }
    });
    globalThis.location.reload();
  }

  loadBackground() {
    const dataURL = localStorage.getItem("mahjongBackground");
    if (dataURL) {
      setStyleSheet(
        `mahjongBackground`,
        `.board .discards { background-image: url(${dataURL}); }`
      );
    }
    return !!dataURL;
  }

  saveBackground(background) {
    localStorage.setItem("mahjongBackground", background);
  }

  loadSidebar() {
    const dataURL = localStorage.getItem("mahjongSidebar");
    if (dataURL) {
      setStyleSheet(
        `mahjongSidebar`,
        `.board .sidebar { background-image: url(${dataURL}); }`
      );
    }
    return !!dataURL;
  }

  saveSidebar(background) {
    localStorage.setItem("mahjongSidebar", background);
  }

  loadPlayerBanks() {
    const dataURL = localStorage.getItem("mahjongPlayerBanks");
    if (dataURL) {
      setStyleSheet(
        `mahjongPlayerBanks`,
        `.players .player { background-image: url(${dataURL}); }`
      );
    }
    return !!dataURL;
  }

  savePlayerBanks(background) {
    localStorage.setItem("mahjongPlayerBanks", background);
  }

  async loadTileset() {
    const dataURL = localStorage.getItem("mahjongTileset");
    if (dataURL) {
      setStyleSheet(
        `mahjongTileset`,
        await TileSetManager.createTileSetCSS(dataURL)
      );
    } else { TileSetManager.loadDefault(); }
    return !!dataURL;
  }

  saveTileset(background) {
    localStorage.setItem("mahjongTileset", background);
  }

  /**
   * Configure all the configurable options and
   * then relaunch the game on the appropriate URL.
   */
  show() {
    const panel = this.modal.makePanel(`settings`);
    panel.innerHTML = `<h3>Change the game theme</h3>`;
    const options = this.getOptions();
    const table = this.modal.buildPanelContent(options);
    this.addFormControls(panel, table, options);
    this.modal.addFooter(panel, "Close");
  }

  addFormControls(panel, table, options) {
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

  getOptions() {
    const handle = (fnName) => (entry, evt) =>
      fileLoader(evt).then((file) => {
        this[`save${fnName}`](file.dataURL);
        this[`load${fnName}`]();
      });

    const options = [
      {
        label: "Background image",
        type: `file`,
        handler: handle("Background"),
      },
      {
        label: "Sidebar image",
        type: `file`,
        handler: handle("Sidebar"),
      },
      {
        label: "Player banks",
        type: `file`,
        handler: handle("PlayerBanks"),
      },
      {
        label: "Tileset",
        type: `file`,
        handler: handle("Tileset"),
      },
      {
        label: "CSS colors",
        button_label: "Change...",
        type: `button`,
        evtType: `click`,
        handler: (entry, evt) => {
          this.modal.pickColors();
        }
      }
    ];

    return options;
  }
}

export { ThemeModal };
