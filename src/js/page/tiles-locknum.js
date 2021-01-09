/**
 * This is a bit of JS that helps generate all the necessary CSS
 * to ensure sets in the hand have the correct separators. We could
 * write this out by hand, but it'd be a lot of repetition, and
 * programming languages were literally invented to prevent that.
 */
(function generateLockedSetSeparationCSS() {

  const style = document.createElement("style");
  const rules = [];
  const max = 8 + 4*4 + 2; // all bonus tiles, four kongs, and a pair (damn!)
  const max_dist = 5;      // locknum difference between two first-tiles-in-set

  for (let i=1; i<max; i++) {
    for (let j=i+1; j<=i+max_dist; j++) {
      // NOTE: This relies on the --mr variable that is declared in tiles-locknum.css
      rules.push(`game-tile[locknum="${i}"] + game-tile[locknum="${j}"] { margin-left: var(--mr); }`);
    }
  }

  const css = rules.join('\n');
  style.textContent = css;
  document.head.appendChild(style);

})();
