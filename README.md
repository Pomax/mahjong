# A Mahjong client/server project.

This repository contains a client/server implementation for playing networked [Mahjong](https://en.wikipedia.org/wiki/Mahjong), using web sockets to connect each player to the server, specifically relying on [socket.io](http://socket.io).

And for those who think mahjong is a single-player tile matching game: it's not. It's a four player competitive game around forming high-scoring tile combinations with limited [common knowledge](https://en.wikipedia.org/wiki/Common_knowledge_%28logic%29) as well as [imperfect information](https://en.wikipedia.org/wiki/Perfect_information) local for each player.

## Running things

You'll need [Node.js](https://nodejs.org) to run this project, which at this point I kind of expect everyone has installed anyway. If not, install that first. You'll also need `git`, of course, but you're looking at a project on github so that part shouldn't have needed mention.

With Node.js installed, the simplest way to run things is to `git clone` this repo, run `npm install` in the `./mahjong` dir that makes (to get all the dependencies installed), and to then run `npm start` in the same dir to start up both the server (which runs from `./apps/server/server.js`) and run a live-compile for the client code (compiled using the webpack config in the base dir, with `./apps/client/react/App.jsx` as entry point).

- The server will run as game host on [http://localhost:8081/](http://localhost:8081)
- The client is served on [http://localhost:8081/client](http://localhost:8081/client)

Connecting to [http://localhost:8081/](http://localhost:8081) will redirect you to a test page that four iframes, one for each player, each of which automatically connect to the game lobby for joining games or starting a new game.

To do test play, make one player start a new game, then have the other players join that game. Once a game has four players, the game starts.

## Socket.io timing

I've seen socket.io completely ignore, or not ever get, socket data if too much code runs synchronously. At least, that's what it looks like. As such, most socket.emit calls are wrapped in a process.nextTick() in `lib/game/player.js`'s `send(msg,payload)` function. I'm pretty sure this can't scale, but for now it'll do. There is [an issue](https://github.com/Pomax/mahjong/issues/10) for investigating this, if you want to help do that, you are my hero.

## Release status

**status: close to alpha release**
 
This is a work in progress, so there's plenty that doesn't work right now, hopefully I can take this line out of the README.md in the near future.

