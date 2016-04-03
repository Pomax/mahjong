# Mahjong server

This directory houses the server part of the mahjong client/server code.

## Development

The server consists of a simple [express](http://expressjs.com) application that sets up
basic route handling for starting games and testing, with a structure game
manager for handling games.

## Game Manager

Games are managed through a chain of responsibility, with concerns separated based
on game roles. These are:

- `lib/game/game-manager`, the overall manager for all games on the server, and clients connected.
- `lib/game/game`, the manager for an individual game being played on the server.
- `lib/game/hand`, the manager for an individual hand being played as part of a game.
- `lib/game/player`, a local representation of players in games, used to verify client state and actions.

Additionally, the `tiles` and `wall` objects are used for bootstrapping and utility purposes.

## Rulesets

The `lib/game/rulesets` directory contains objects that act as evaluators of legal plays
and scoring of tile patterns.

Currently available rulesets are:

### `minimal`, a basic ruleset

In the minimal ruleset, winning requires four sets and a pair, all losers pay the winner equally,
and points are awarded as:

win: 10 points
chow: 0 points
pung: 1 point, or 2 points when concealed
kong: 2 points, or 4 points when concealed
bonus: 1 point

## Game protocol

The server communicates with clients using websockets, using simple `(eventname, payload)`
tuples, where the `eventname` is a string, and the `payload` is object encoding arbitrary
key/value pairs.

The Server listens for socket events from the clients pertaining to game administration
(joining, etc) as well as play information.

### Game structure

Games are structured as:

- a game is created
- clients join the game
- the game is accepted as 'in progress'
- a hand is started
- players are dealt initial tiles
- the game loop is entered

The game loop consists of:

- The active player analyses their tiles to see if they have won.
  - if they have, they declare a win, and play halts.
  - if they have not, they must discard a tile and play continues.
- other players may claim the discarded tile.
  - if a claim is made, the discard is awarded to the highest claim, the corresponding player is marked as active player, and the game loop restarts.
  - if no claims are made, the next player is made active player and dealt a tile, and the game loop restarts.

The game is a draw if there are no tiles left in the wall to deal to the players.

### Protocol messages and payloads

...
