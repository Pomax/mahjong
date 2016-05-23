# This document contains important information relating to dev work

- This code uses ES6 and newer JavaScript syntax.

- Because backticks-for-quotes are a blight on the typographical landscape,
  I refuse to use them. My code uses ' and ", both of which get rewritten
  at compile time so I never have to see backticks where they don't belong.
  This is dealt with by the "src/lib/fix.js" require shim.

- Where possible, only ' is used, because we're not quoting text, we're
  delimiting string data. As JavaScript has no char vs String distinction,
  there is almost never any reason to use ".

- Code uses 2 spaces for indentation. No tabs allowed (yes, it takes up
  bytes, but dev files taking up space is irrelevant; it gets minified
  away, and as dev purposes you want clarity, not conciseness).

- Incompletions in the code are marked with FIXME: and TODO:, usually both.
