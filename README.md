# A Mahjong client/server project.

This repository contains a client/server implementation for playing networked [Mahjong](https://en.wikipedia.org/wiki/Mahjong), using web sockets to connect each player to the server, specifically relying on [socket.io](http://socket.io).

And for those who think mahjong is a single-player tile matching game: it's not. It's a four player competitive game around forming high-scoring tile combinations with limited [common knowledge](https://en.wikipedia.org/wiki/Common_knowledge_%28logic%29) as well as [imperfect information](https://en.wikipedia.org/wiki/Perfect_information) local for each player.

## Running things

You'll need [Node.js](https://nodejs.org) to run this project, which at this point I kind of expect everyone has installed anyway (along with python). With that, the simplest way to run things is to `git clone` the repo, run `npm install` in the resulting dir to get all the dependencies installed, and then run `npm start` in the same dir to start up both the server (from `apps/server`) and run a live-compile for the client code (from `apps/client/react`).

- The game server will run as game host on [http://localhost:8081](http://localhost:8081)
- The client is served on [http://localhost:8081/client](http://localhost:8081/client)

Connecting to [http://localhost:8081](http://localhost:8081) will redirect you to a test page that four iframes, one for each player, each of which automatically connect to the game lobby for joining games or starting a new game.

For testing, make one player start a new game, then join the other three players to that game. Once a game has four players, a round of play starts.

## Socket.io timing

I've seen socket.io completely ignore, or not ever get, socket data if too much code runs synchronously. As such, most socket.emit calls are wrapped in a process.nextTick() in `lib/game/player.js`'s `send(msg,payload)` function. I'm pretty sure this can't scale, but for now it'll do. There is [an issue](https://github.com/Pomax/mahjong/issues/10) for investigating this, if you want to help do that, you are my hero.

## Release status

**status: Pre-alpha**
 
This is a work in progress, so there's plenty that doesn't work right now, hopefully I can take this line out of the README.md in the near future.

