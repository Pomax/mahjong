# Mahjong. In the browser.

1: We're talking real "four players sitting around a table" mahjong here. Not the "one player solitaire" game. That game has literally nothing to do with mahjong.

2: This README.md has been kept sparse pending a set of full length development articles that walk through going from "having an idea" to "having finished writing a fully functional game".

### Can I play this game?

You sure can! And you don't even need to sign up for anything, or check out any programming code, or do anything beyond just clicking through to the live website: https://pomax.github.io/mahjong

Note that mostly due to "that's what we play in our house a lot", this implementation currently comes with "Chinese Classical" and "Cantonese" rules for play and scoring. Additional rules may eventually be written up, but if you want to get ahead of the game and implement one so it can be added to the repo, those will be more than welcome.

### What it looks like

![A screenshot of what the live game looks like when set to autoplay](https://user-images.githubusercontent.com/177243/53316594-5767d200-387d-11e9-86e2-ed8957d7feb2.png)

### What if I want a different look?

Not a problem, since this is just a webpage, you can customize your look using [User Styles](https://userstyles.org/) as much as you like. In fact, if you want to try some of the other styles that other folks already made, have a look at any of the following to see if they suit your mood better!

- https://userstyles.org/styles/217123/mahjong-woodsy-classic (by lexterror)

### This is a pure HTML, CSS, and JavaScript game

That means there are no bundlers, no web app packaging, no CSS preprocessors or JS transpiling, just an index.html, a bunch of CSS files, and a bunch of JS files. If you can load the page, you now have a full copy of the game that you can save to your desktop and congratulations, you now have your own copy "installed" without doing anything beyond just downloading the page and its local page assets.

I can hear the web devs amongst you thinking "but... then isn't it horribly inefficient?" to which I'm just going to point out that this is how we used to write the web and it was, and still is, blazing fast. This game has a [Google PageSpeed ranking of 97/98](https://developers.google.com/speed/pagespeed/insights/?url=https%3A%2F%2Fpomax.github.io%2Fmj%2F), so: don't be fooled (or, don't fool yourself) into thinking everything needs to be a web app bundle to be performant.

### Debugging using query parameters

Open `index.html` in your browser. Debugging options are set via URL query parameter, however, the way to toggle these is via the settings menu.

![A screenshot of the settings menu](https://user-images.githubusercontent.com/177243/54255517-a9635580-4515-11e9-8988-0520214e9a52.png)

### Node based testing

Most of the code is aware of whether it's running in the browser, or in node context. As such, the following things work:

- `node src/js/test/hand-generator` generates all possible hand patterns (based on tile category, not tile face)
- `node src/js/core/algorithm/tiles-needed.js` runs unit tests
- `node src/js/core/scoring/chinese-classical.js` runs unit tests

And for full gameplay debugging through play recordings, you can use `node src/js/test/play-game` with the following optional flags:

- `-s <number>` the initial seed value for the pseudo-random number generator (defaults to 1).
- `-r <number>` the number of games to play, bumping the seed up by 1 for each new game (defaults to 1).
- `-nw` do **n**ot **w**rite a game log file upon finishing a game (defaults to writing log files).
- `-cc` use the Chinese Classical ruleset (default ruleset).
- `-cn` use the Cantonese ruleset.

### I have (a) question(s)!

I'd be happy to answer them! Feel free to [drop me a message](https://mastodon.social/@TheRealPomax) for shallow engagement, or file an issue over on [the issue tracker](https://github.com/Pomax/mahjong/issues) if you need deeper engagement.
