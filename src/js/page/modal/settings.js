class SettingsModal {
  constructor(modal) {
      this.modal = modal;
  }

  /**
   * Configure all the configurable options and
   * then relaunch the game on the appropriate URL.
   */
  show() {
    let panel = this.modal.makePanel(`settings`);
    panel.innerHTML = `
      <h3>Change the game settings</h3>
      <p>
        The follow settings change how the game works, but while
        the first three options are related to playing the game,
        all the other options are primarily intended for debugging.
      </p>
    `;

    let form = document.createElement('form');
    form.setAttribute("name", "settings");
    form.setAttribute("action", "index.html");
    form.setAttribute("method", "GET");
    let table = document.createElement('table');
    form.appendChild(table);
    panel.appendChild(form);

    // add all config options here
    const defaults = config.DEFAULTS;
    const values = {};

    const differs = key => defaults[key.toUpperCase()].toString() !== values[key];

    Object.keys(defaults).forEach(key => {
      values[key.toLowerCase()] = config[key].toString();
    });

    const options = {
      'Rules': { key: 'rules', options: [...Ruleset.getRulesetNames()] },
      '-0': {},
      '🀄 Always show everyone\'s tiles': { key: 'force_open_bot_play', options: ['true','false'] },
      '✨ Highlight claimable discards': { key: 'show_claim_suggestion', options: ['true','false'] },
      '💬 Show bot play suggestions': { key: 'show_bot_suggestion', options: ['true','false'] },
      '-1': {},
      // flags
      '💻 Turn on debug logging' : { key: 'debug', options: ['true','false'] },
      '🎵 Play without sound': { key: 'no_sound', options: ['true','false'] },
      '♻️ Autostart bot play': { key: 'play_immediately', options: ['true','false'] },
      '🛑 Pause game unless focused': { key: 'pause_on_blur', options: ['true','false'] },
      '😐 Pretend hands start after a draw': { key: 'force_draw', options: ['true','false'] },
      '📃 Generate game log after play': { key: 'write_game_log', options: ['true','false'] },
      '-2': {},
      // values
      'Set random number seed': { key: 'seed' },
      'Bot quick play threshold': { key: 'bot_chicken_threshold' },
      'Delay (in ms) between player turns': { key: 'play_interval' },
      'Delay (in ms) before starting next hand': { key: 'hand_interval' },
      'Delay (in ms) for bots reacting to things': { key: 'bot_delay_before_discard_ends' },
      'Set up a specific wall': { key: 'wall_hack', options: ['', ...Object.keys(WallHack.hacks)], value: values.wall_hack },
    };


    Object.keys(options).forEach(label => {
      if (label.startsWith('-')) {
        let row = document.createElement('tr');
        row.innerHTML = `<td colspan="2">&nbsp;</td>`;
        return table.appendChild(row);
      }
      let data = options[label];
      let value = values[data.key];
      let row = document.createElement('tr');
      let field = `<input class="field" type"text" value="${value}">`;
      if (data.options) {
        field = `<select class="field">${data.options.map(t => `<option value="${t}"${t===value? ` selected`:``}>${t.replace(/_/g,' ')}</option>`)}</select>`;
      }
      row.innerHTML = `
        <td>${label}</td>
        <td${differs(data.key) ? ` class='custom'` : ``}>${field}</td>
      `;
      table.appendChild(row);
      let element = row.querySelector('.field:last-child');
      element.addEventListener('input', evt => {
        values[data.key] = evt.target.value;
      });
    });

    let row = document.createElement('tr');
    row.classList.add('spacer-1');
    row.innerHTML = `
      <td>
        <input id="reset" type="reset" value="Reset to default settings">
      </td>
      <td>
        <input id="ok" type="submit" value="Play using these settings">
      </td>
    `;
    table.appendChild(row);

    form.addEventListener("submit", evt => {
      evt.preventDefault();
      let suffix = Object
        .keys(values)
        .filter(key => differs(key))
        .map(key => `${key}=${values[key]}`)
        .join('&');

      window.location.search = suffix ? `?${suffix}` : ``;
    });

    let ok = table.querySelector('#ok');
    panel.gainFocus = () => ok.focus();

    let reset = table.querySelector('#reset');
    reset.addEventListener('click', evt => (window.location.search=''));

    this.modal.addFooter(panel, "Discard changes");
  }
}

if (typeof process !== "undefined") {
  module.exports = SettingsModal;
}
