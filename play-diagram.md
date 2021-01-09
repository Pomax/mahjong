# Diagrams

Code path diagrams are useful for understanding how things work.

## Play diagram

The main play loop

```
Game:
    - startHand
    ^   |
    |   +- dealTiles
    |   +- preparePlay -> resolveKongs
    |   |                  ^      |
    |   |                  |      +--processKong
    |   |                   `-----'
    |   `- play <-----------------------------------------------------+---,
    |      ^  |                                                       |   |
    |      |  +- dealTile                                             |   |
    |      |  +- getDiscard -------------(no discard)--> processWin --'   |
    |      |  |   ^     |                                                 |
    |      |  |   |     +-processKong                                     |
    |      |  |   |     |                                                 |
    |      |  |   `-----'                                                 |
    |      |  +- processDiscard                                           |
    |      |  +- getAllClaims -------------(claim)-----> processClaim ----'
    |    no|  |
    |      `--+ "wall exhausted?"
    `---------'
        yes
```
