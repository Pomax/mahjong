import { config, CLAIM } from "../../../config.js";
import { BotPlayer } from "./bot.js";
import { ClientUI } from "./ui/client-ui.js";


/**
 * And this is a human player... which is "a kind
 * of bot player" and that might seem surprising,
 * but the reason we do this is because it allows
 * us to get a bot player helping the human player
 * "for free", and that's great!
 */
class HumanPlayer extends BotPlayer {
  constructor(id, chicken=false) {
    super(id, chicken);
    // humans need a UI to play mahjong.
    this.ui = new ClientUI(this, this.tracker);
  }

  /**
   * Let the human player figure out what to discard
   * through the UI. However, have the underlying bot
   * perform their discard logic and offer the tile
   * they come with as a play suggestion.
   */
  determineDiscard(tilesRemaining, resolve) {
    const giveAllSuggestions = true;
    // Let's ask our "bot" assistant for what
    // it would suggest we throw away:
    super.determineDiscard(tilesRemaining, suggestion => {
      if (config.BOT_PLAY) return resolve((suggestion && suggestion.length) ? suggestion[0] : suggestion);
      if (suggestion && !suggestion.length) suggestion = [suggestion];
      this.ui.listenForDiscard(discard => {

        // If we're discarding, even if our bot superclass
        // determined we were holding a selfdrawn win, we
        // are not claiming a win and so need to unset this:
        if (discard) this.selfdraw = false;

        // Special handling for self-declared kongs:
        if (discard && discard.exception === CLAIM.KONG) {
          let kong = discard.kong;

          // fully concealed kong!
          if (kong.length === 4) this.lockClaim(kong, true);

          // melded kong from existing pung:
          else this.meldKong(kong[0]);
        }

        // And then fall through to the original resolution function
        resolve(discard);
      }, suggestion, this.lastClaim);
    }, giveAllSuggestions);
  }

  /**
   * Let the human player figure out whether to make
   * a claim through the UI. However, have the underlying
   * bot perform their claim logic and offer the claim
   * they come with as a play suggestion.
   */
  determineClaim(pid, discard, tilesRemaining, resolve, interrupt, claimTimer) {
    // And of course, the same applies here:
    super.determineClaim(pid, discard, tilesRemaining, suggestion => {
      if (config.BOT_PLAY) return resolve(suggestion);
      this.ui.listenForClaim(pid, discard, suggestion, resolve, interrupt, claimTimer);
    });
  }

  /**
   * Let the human player figure out whether to rob a
   * kong, if it means they can win. However, have the
   * underlyaing bot perform their analysis and offer
   * their conclusion as a play suggestion.
   */
  robKong(pid, tiles, tilesRemaining, resolve) {
    super.robKong(pid, tiles, tilesRemaining, suggestion => {
      if (config.BOT_PLAY) return resolve(suggestion);
      this.ui.spawnKongRobDialog(pid, tiles, tilesRemaining, suggestion, resolve);
    });
  }
}

export { HumanPlayer };
