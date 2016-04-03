# Mahjong client

This directory houses the client part of the mahjong client/server code.

## Development

The client is a React application, with entry point `react/App.jsx`,
which is the loader for `react/pages/Client.jsx`, which sets up a
single-page app for players.

Components used in clients are:

- the `Player`, representing everything the player knows about their own hand and the active game.
- the `OtherPlayers`, representing the player's knowledge about the other players' tiles and progress.
- the `Discards`, representing tiles that are no longer available this hand of play.
- the `Wall`, representing how many tiles are left during a particular hand of play.

## Game protocol

Clients communicate with the game server using websockets, which communicate
via simple `(eventname, payload)` tuples, where the `eventname` is a string,
and the `payload` is object encoding arbitrary key/value pairs.

The Client listens for socket events from the server, which affect the UI state,
as well as input events from the user, which generally lead to emitting an event
over the socket to the game server to inform it that the user took some action.

### Protocol messages and payloads

...
