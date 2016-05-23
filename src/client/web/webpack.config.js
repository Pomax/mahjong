var path = require('path');

require(path.join(__dirname,'../../lib/fix'));

var webpack = require('webpack');
var fs = require('fs');

// relative to the webpack.config.js file
var clientBase = '';
var serverBase = '../../server/public';

// Bundle entry point
var entry = [
  path.join(__dirname, clientBase, 'react', 'Client.jsx')
];

// Bundle output
var output = {
  path: path.join(__dirname, serverBase, 'js'),
  filename: 'client.js',
  publicPath: '/js/',
};

// And the final config that webpack will read in.
module.exports = {
  entry:  entry,
  target: "web",
  output: output,
  module: {
    loaders: [
      {
        test: /.jsx?$/,
        exclude: /node_modules/,
        loaders: [
          'babel',
          'eslint'
        ]
      }
    ]
  },
  eslint: {
    configFile: path.join(__dirname, clientBase, '.eslintrc')
  }
};
