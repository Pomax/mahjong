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
    ].forEach((key) => {
      localStorage.removeItem(key);
      const e = document.getElementById(`mahjongBackground`);
      if (e) {
        e.parentNode.removeChild(e);
      }
    });
    window.location.reload();
  }

  setStyleSheet(id, css) {
    let style = document.getElementById(id);
    if (style) {
      style.parentNode.removeChild(style);
    } else {
      style = document.createElement(`style`);
    }
    style.id = id;
    style.textContent = css;
    document.body.append(style);
  }

  loadBackground() {
    const dataURL = localStorage.getItem("mahjongBackground");
    if (dataURL) {
      this.setStyleSheet(
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
      this.setStyleSheet(
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
      this.setStyleSheet(
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
      this.setStyleSheet(
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

            const box = {
              x: tileWidth * c + 1,
              y: tileHeight * r + 1,
              w: tileWidth - 2,
              h: tileHeight - 2,
            };

            const crop = document.createElement(`canvas`);
            crop.width = box.w;
            crop.height = box.h;
            console.log(r, c, `:`, box.x, box.y);
            crop
              .getContext("2d")
              .drawImage(
                canvas,
                box.x,
                box.y,
                box.w,
                box.h,
                0,
                0,
                box.w,
                box.h
              );
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
      switch (col) {
        case 0:
          return 27;
        case 1:
          return 28;
        case 2:
          return 29;
        case 3:
          return 30;
        case 5:
          return 31;
        case 6:
          return 32;
        case 7:
          return 33;
      }
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

    const table = document.createElement(`table`);
    panel.append(table);

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

    // FIXME: TODO: make this create a stylesheet rather than assigning style directly

    const handle = (fnName) => (evt) =>
      fileLoader(evt).then((file) => {
        this[`save${fnName}`](file.dataURL);
        this[`load${fnName}`]();
      });

    const builder = {
      background: {
        label: "Background image",
        handler: handle("Background"),
      },
      sidebar: {
        label: "Sidebar image",
        handler: handle("Sidebar"),
      },
      bank: {
        label: "Player banks",
        handler: handle("PlayerBanks"),
      },
      tileset: {
        label: "Tileset",
        handler: handle("Tileset"),
      },
      reset: {
        label: "Reset theming and reload",
        text: "reset & reload",
        button: true,
        handler: () => this.reset(),
      },
    };

    Object.keys(builder).forEach((key) => {
      const value = builder[key];
      const type = value.button ? `button` : `file`;
      const text = value.button ? value.text : `pick...`;

      const tr = document.createElement(`tr`);
      table.append(tr);
      tr.innerHTML = `
        <td style="white-space: nowrap">${value.label}</td>
        <td><input class="picker" type="${type}" value="${text}"></td>
      `;

      const picker = tr.querySelector(`.picker`);
      const evtType = value.button ? `click` : `input`;
      picker.addEventListener(evtType, (evt) => builder[key].handler(evt));
    });

    this.modal.addFooter(panel, "Close");
  }
}

if (typeof process !== "undefined") {
  module.exports = ThemeModal;
}
