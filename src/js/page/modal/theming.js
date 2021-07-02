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
      this.modal.setStyleSheet(
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
      this.modal.setStyleSheet(
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
      this.modal.setStyleSheet(
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
      this.modal.setStyleSheet(
        `mahjongTileset`,
        await this.createTileSetCSS(dataURL)
      );
    }
    return !!dataURL;
  }

  createTileSetCSS(dataURL) {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = dataURL;
      img.onload = (evt) => {
        const css = [];
        const tileWidth = img.width / 9;
        const tileHeight = img.height / 5;
        const canvas = document.createElement(`canvas`);
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext(`2d`);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        for (let r = 0; r < 5; r++) {
          for (let c = 0; c < 9; c++) {
            const tileNumber = this.getTileNumber(r, c);
            if (tileNumber === false) continue;

            const [x, y, w, h] = [
              tileWidth * c + 1,
              tileHeight * r + 1,
              tileWidth - 2,
              tileHeight - 2,
            ];

            const crop = document.createElement(`canvas`);
            crop.width = w;
            crop.height = h;
            crop.getContext("2d").drawImage(canvas, x, y, w, h, 0, 0, w, h);
            css.push(
              `[tile="${tileNumber}"] { background-image: url(${crop.toDataURL()}); }`
            );
          }
        }
        resolve(css.join(`\n`));
      };
    });
  }

  getTileNumber(row, col) {
    if (row < 3) return col + 9 * row;
    if (row === 3) {
      if (col < 4) return 27 + col;
      if (col < 8) return 31 - 5 + col;
    }
    if (row === 4) {
      if (col !== 8) return 34 + col;
      return -1;
    }
    return false;
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
