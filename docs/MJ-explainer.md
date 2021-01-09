# Implementing Mahjong

This article started off as a series of [jsbin](https://jsbin.com) links on twitter that went from implementing a mahjong table using CSS to a working multi-player game of mahjong, and it turns out that as fun as that was, wrapping the iterations in an article that talks about the process of going from "nothing" to "multiplayer online game implementation" is actually kind of educationally useful, so let's look at how to implement the game of mahjong (the real one, not the "mahojng solitaire" thing) by starting small, and building it out one bit at a time until we have a game that we could, in theory, package up and put on an app store somewhere.

## So what is Mahjong?

> _"It's basically a draw 1, play 1 game."_
> —Pomax

It's usually a good idea to explain the thing we're going to try to achieve, which in this case means explaining what kind of game Mahjong actually is.

At its core, Mahjong is a four player card game—except the cards are physical chunks of material and much smaller than a playing card, and they're called tiles—where all players start with a certain number of tiles, and then take turns drawing a tile, seeing if they now have a winning tile pattern, and if not, pick one of their tiles to discard before it's the next player's turn.

Of course, the deck is slightly different from a standard card deck. For starters, there are 144 tiles, so let's discuss what our play resource looks like.

There are three categories of tiles:

1. numbered tiles, in three suits,
2. unnumbered tiles, in two suits, and
3. bonus tiles, with each suited tile in the deck four times, and each bonus tile in the deck once.

The numbered suits are numbers 1 through 9 with dot ornamentation, bamboo ornamentation and Chinese character ornamentation. The unnumbered suits (also called "honours") are:

1. the "winds" suit, consisting the four cardinal directions (east/south/west/north), and
2. the "dragons" suit, consisting of the "green", "red" and "white" dragon (at least, that's what they're called in English, so we'll roll with that for now).

The bonus tiles consist of four "season" tiles and four "seasonal flower" tiles, and don't do anything other than "get you free points" if you happen to draw certain ones, and you don't use them to form tile patterns with (you just put them aside and grab a replacement tile for it. If that's also a bonus tile, repeat).

In fact, if you have a font with wide enough Unicode support, you should be able to see what these tiles look like because all these tiles have their own Unicode points:

- dots 1 through 9: 🀙🀚🀛🀜🀝🀞🀟🀠🀡
- bamboo tiles: 🀐🀑🀒🀓🀔🀕🀖🀗🀘
- character tiles: 🀇🀈🀉🀊🀋🀌🀍🀎🀏
- winds: 🀀🀁🀂🀃
- dragons: 🀅🀄🀆
- seasons: 🀦🀧🀨🀩
- flowers:🀢🀣🀤🀥

We could use those in our implementation, but I prefer to play with "real" tiles, so let's instead use all the tiles as found over on https://github.com/Pomax/MJJS/tree/gh-pages/public/tiles because I just like them better. Probably because they are literally the tiles I have sitting on our games shelf.

![https://raw.githubusercontent.com/Pomax/MJJS/gh-pages/public/tiles/39.jpg](https://raw.githubusercontent.com/Pomax/MJJS/gh-pages/public/tiles/38.jpg) ![https://raw.githubusercontent.com/Pomax/MJJS/gh-pages/public/tiles/39.jpg](https://raw.githubusercontent.com/Pomax/MJJS/gh-pages/public/tiles/39.jpg) ![https://raw.githubusercontent.com/Pomax/MJJS/gh-pages/public/tiles/39.jpg](https://raw.githubusercontent.com/Pomax/MJJS/gh-pages/public/tiles/40.jpg) ![https://raw.githubusercontent.com/Pomax/MJJS/gh-pages/public/tiles/39.jpg](https://raw.githubusercontent.com/Pomax/MJJS/gh-pages/public/tiles/41.jpg)

In fact, we can even turn those tiles into a dedicated OpenType font with SVG colour glyphs, and add that to our game code once we're done, so we don't need to load tons of tiny images as loads of separate downloads. But now we're getting ahead of ourselves: I think it's time we started writing some code. 

  
- https://jsbin.com/cujapasese/2/edit?html,css,js,output (css variables)
- https://jsbin.com/yituteboje/1/edit?css,output (tiles, click to discard)
- https://jsbin.com/xuwuwajode/35/edit?js,output (basic sync pung-only play)
- https://jsbin.com/weqilisiqi/7/edit?js,output (mildly improved sync play)
- https://jsbin.com/kubuweravu/5/edit?js,output (async play)
- https://jsbin.com/zimuzufoco/1/edit?js,output (async with a Player class)
- https://jsbin.com/yenobexiku/6/edit?js,output (async claim and discard)
- https://jsbin.com/yawenuyufi/2/edit?html,output (human play enabled)
- https://jsbin.com/mapoxuwata/1/edit?js,output (chows enabled)
- 