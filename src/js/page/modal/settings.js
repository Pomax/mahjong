import { config } from "../../../config.js";
import { Ruleset } from "../../core/scoring/ruleset.js";
import { WallHack  } from "../../core/game/wall/wall-hack.js";

class SettingsModal {
  constructor(modal) {
    this.modal = modal;
  }

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
    const options = this.getOptions();
    const form = this.modal.buildPanelContent(options, true);
    form.setAttribute("name", "settings");
    form.setAttribute("action", "index.html");
    form.setAttribute("method", "GET");
    this.addFormControls(panel, form, options);
    this.modal.addFooter(panel, "Closing without saving");
  }

  addFormControls(panel, form, options) {
    const table = form.querySelector(`table`);
    let row = document.createElement(`tr`);
    row.classList.add(`spacer-1`);
    row.innerHTML = `
      <td>
        <input id="reset" type="reset" value="Reset to default settings">
      </td>
      <td>
        <input id="ok" type="submit" value="Play using these settings">
      </td>
    `;
    table.appendChild(row);

    form.addEventListener(`submit`, (evt) => {
      evt.preventDefault();
      let suffix = options
        .filter((e) => e.value != e.default_value)
        .map((e) => `${e.key}=${e.value}`)
        .join("&");
        globalThis.location.search = suffix ? `?${suffix}` : ``;
    });

    let ok = table.querySelector(`#ok`);
    panel.gainFocus = () => ok.focus();

    let reset = table.querySelector(`#reset`);
    reset.addEventListener("click", (evt) => (globalThis.location.search = ""));
  }

  getOptions() {
    const options = [
      {
        label: `Rules`,
        key: `rules`,
        options: [...Ruleset.getRulesetNames()],
      },
      {
        // basic boolean flags:
      },
      {
        label: `🀄 Always show everyone's tiles`,
        key: `force_open_bot_play`,
        toggle: true,
      },
      {
        label: `✨ Highlight claimable discards`,
        key: `show_claim_suggestion`,
        toggle: true,
      },
      {
        label: `💬 Show bot play suggestions`,
        key: `show_bot_suggestion`,
        toggle: true,
      },
      {
        // additional boolean flags:
      },
      {
        label: `🎵 Play sounds`,
        key: `use_sound`,
        toggle: true,
      },
      {
        label: `🟢 Start play immediately`,
        key: `play_immediately`,
        toggle: true,
      },
      {
        label: `⏸️ Pause game unless focused`,
        key: `pause_on_blur`,
        toggle: true,
      },
      {
        label: `💻 Turn on debug mode`,
        key: `debug`,
        toggle: true,
      },
      {
        label: `❌ Pretend previous round was a draw`,
        key: `force_draw`,
        toggle: true,
        debug_only: true,
      },
      {
        label: `📃 Generate game log after play`,
        key: `write_game_log`,
        toggle: true,
        debug_only: true,
      },
      {
        // numerical values:
      },
      {
        label: `Set game PRNG seed`,
        key: `seed`,
        debug_only: true,
      },
      {
        label: `Bot quick play threshold`,
        key: `bot_chicken_threshold`,
        debug_only: true,
      },
      {
        label: `Delay (in ms) between player turns`,
        key: `play_interval`,
      },
      {
        label: `Delay (in ms) before starting next hand`,
        key: `hand_interval`,
      },
      {
        label: `Delay (in ms) for bots reacting to things`,
        key: `bot_delay_before_discard_ends`,
      },
      {
        label: `Delay (in ms) during full bot play`,
        key: `bot_play_delay`,
      },
      // and debug hacking
      {
        label: `Set up a specific wall`,
        key: `wall_hack`,
        options: [``, ...Object.keys(WallHack.hacks)],
        debug_only: true,
      },
    ];

    options.forEach((entry) => {
      const { key } = entry;
      if (key) {
        const CONFIG_KEY = key.toUpperCase();
        entry.value = config[CONFIG_KEY];
        entry.default_value = config.DEFAULT_CONFIG[CONFIG_KEY];
      }
    });
    return options;
  }
}

export { SettingsModal };
