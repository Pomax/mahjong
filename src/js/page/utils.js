function setStyleSheet(id, css) {
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

class TileSetManager {
  static loadDefault() {
    this.createTileSetCSS(`./img/tiles/default-tileset.png`).then((css) =>
      setStyleSheet(`default-tiles`, css)
    );
  }

  static createTileSetCSS(dataURL) {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = dataURL;
      img.onload = (evt) => {
        const css = [];
        const tileWidth = img.width / 9;
        const tileHeight = img.height / 5;
        console.log(img.width, img.height, tileWidth, tileHeight);
        const canvas = document.createElement(`canvas`);
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext(`2d`);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        for (let r = 0; r < 5; r++) {
          for (let c = 0; c < 9; c++) {
            const tileNumber = TileSetManager.getTileNumber(r, c);
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

  static getTileNumber(row, col) {
    if (row < 3) return col + 9 * row;
    if (row === 3) {
      if (col < 4) return 27 + col;
      if (col === 4) return false;
      if (col < 8) return 31 - 5 + col;
    }
    if (row === 4) {
      if (col !== 8) return 34 + col;
      return -1;
    }
    return false;
  }
}

export { TileSetManager, setStyleSheet };
