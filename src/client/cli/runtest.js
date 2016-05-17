// server setup
'use strict'

var Bot = require('../basic/client');
var Human = require('./client');
var Manager = require('../../core/manager');
var gm = new Manager();
var game = gm.createGame('minimal');
var getRandomAnimal = require('../../lib/names');

require('inquirer')
.prompt([{
  type: 'input',
  name: 'name',
  message: 'What is your name, hot shot?',
  validate: function (value) {
    let msg = 'No really, what is your name?';
    if (!value) return msg;
    return true;
  }
}])
.then(answers => {
  var username = answers.name;
  console.log('\nAlright, ${username}. Get ready for some...\n');

  [0,1,2,3].map(id => {
    var Client = Bot;
    var name = getRandomAnimal();
    if (id===0) { Client = Human; name = username; }
    gm.createPlayer({ name }, (player, port) => {
      new Client(name, port, () => game.addPlayer(player));
    });
  });
});