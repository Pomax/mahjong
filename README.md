# A Mahjong client/server project.

This repository contains a client/server implementation for playing networked Mahjong, using web sockets to connect each player to the server, specifically relying on [socket.io]().

## Running things

The simplest way to run things is to clone the repo, run `npm install` to get all the dependencies installed, and then run `npm start` to start up the server (from `apps/server`), run a live-compile for the client code (from `apps/client/react`) and run a simple second server for hosting the client file.

- the game server will run on [http://localhost:8081](http://localhost:8081)
- the client server will run on [http://localhost:8080](http://localhost:8080)

Connecting to http://localhost:8081 will load a page that has four iframes, one for each player, automatically starts a game, and registers the four players to this game, after which the game simply starts.

To join a game manually, with four separate tabs/windows, point each tab/window at [http://localhost:8080/game/:gameid](http://localhost:8080/game/0) where `:gameid` is a number 0 or up.

This is a work in progress, so there's plenty that doesn't work right now, hopefully I can take this line out of the README.md in the near future.
