# A Mahjong client/server project.

This repository contains a client/server implementation for playing networked [Mahjong](https://en.wikipedia.org/wiki/Mahjong), using web sockets to connect each player to the server, specifically relying on [socket.io](http://socket.io).

And for those who think mahjong is a single-player tile matching game: it's not. It's a four player competitive game around forming high-scoring tile combinations with limited common knowledge as well as limited private knowledge.

## Running things

You'll need [Node.js](https://nodejs.org) to run this project, which at this point I kind of expect everyone has installed anyway (along with python). With that, the simplest way to run things is to `git clone` the repo, run `npm install` in the resulting dir to get all the dependencies installed, and then run `npm start` in the same dir to start up both the server (from `apps/server`), run a live-compile for the client code (from `apps/client/react`) and finaly run a simple second server for hosting the client over http.

- The game server will run as game host on [http://localhost:8081](http://localhost:8081)
- The client is served on [http://localhost:8080](http://localhost:8080)

Connecting to [http://localhost:8081](http://localhost:8081) will load a page that has four iframes, one for each player, and automatically starts a game after registers the four players to tha same game. Game play is immediate.

To join a game manually, with four separate tabs/windows, point each tab/window at [http://localhost:8080/game/:gameid](http://localhost:8080/game/0) where `:gameid` is a number 0 or up.

This is a work in progress, so there's plenty that doesn't work right now, hopefully I can take this line out of the README.md in the near future.

## Socket.io timing

I've seen socket.io completely ignore, or not ever get, socket data if too much code runs synchronously. As such, most socket.emit calls are wrapped in a process.nextTick() in `lib/game/player.js`'s `send(msg,payload)` function. I'm pretty sure this can't scale, but for now it'll do.