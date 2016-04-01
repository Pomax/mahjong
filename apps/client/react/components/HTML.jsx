var React = require('react');
var Page = require('./Page.jsx');

module.exports = function(props) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>React-rendered HTML page</title>
        <link rel="stylesheet" href="/css/style.css" />
      </head>
      <body>
        <div id="app" dangerouslySetInnerHTML={{__html: props.reactCode}}>
        {/*
          As our routes will have been generated without a top
          level <Route path='/' component={Page}/>, we need to
          make sure to include a <Page/> element here!
        */}
        </div>
        {/*
          When React, with React-Router's help, renders this component,
          we also want to generate a script element that tries to load
          the app bundle anyway: if JS is available, the React app will
          load after the HTML has been parsed into a DOM, and the app
          will simply hook into that prerendered DOM. Convenient!
        */}
        <script src="/js/bundle.js"></script>
      </body>
    </html>
  );
};
