/**
 * Some hawt ASCII art for Kalabox
 *
 * @name art
 */

'use strict';

var chalk = require('chalk');

exports.firstTime = function() {

  // Start our jam
  var lines = [];

  // Paint a picture
  lines.push('###############################################################');
  lines.push('                                                               ');
  lines.push('                    Welcome to Kalabox 2!                      ');
  lines.push('                                                               ');
  lines.push(' We see this is your first time running a Kalabox command that ');
  lines.push(' requires the use of the Kalabox engine. Before we can do this ');
  lines.push(' We need to install some special things to make sure you are   ');
  lines.push(' good to go. Please agree to the prompt below to install all   ');
  lines.push(' the magic. (takes about 5 minutes with average download speed)');
  lines.push('                                                               ');
  lines.push('###############################################################');

  lines[0] = chalk.yellow(lines[0]);

  lines[2] = chalk.green.bold(lines[2]);

  lines[4] = chalk.grey(lines[4]);
  lines[5] = chalk.grey(lines[5]);
  lines[6] = chalk.grey(lines[6]);
  lines[7] = chalk.grey(lines[7]);
  lines[8] = chalk.grey(lines[8]);

  lines[10] = chalk.yellow(lines[10]);

  return lines.join('\n');

};

exports.needsUpdates = function() {

  // Start our jam
  var lines = [];
  var updateLine = [
    'Please run',
    chalk.green('`kbox update`'),
    'before you proceed!'
  ].join(' ');

  // Paint a picture
  lines.push('###############################################################');
  lines.push('                                                               ');
  lines.push('               Hi there! Updates are required!                 ');
  lines.push('                                                               ');
  lines.push(' We see you just updated your kalabox code! That means that    ');
  lines.push(' you should run our updater before you proceed.                ');
  lines.push('                                                               ');
  lines.push('          ' + updateLine + '                                   ');
  lines.push('                                                               ');
  lines.push('###############################################################');

  lines[0] = chalk.yellow(lines[0]);

  lines[2] = chalk.cyan.bold(lines[2]);

  lines[9] = chalk.yellow(lines[9]);

  return lines.join('\n');

};

exports.destroyWarn = function(app) {

  // Start our jam
  var lines = [];

  // Up our name
  var name = app.name.toUpperCase();

  // Paint a picture
  lines.push('###############################################################');
  lines.push('                                                               ');
  lines.push('        WARNING! DESTRUCTION IMMINENT FOR APP ' + name + '     ');
  lines.push('                                                               ');
  lines.push('  This command will remove all the infrastructure needed to    ');
  lines.push('  run your app locally such as services, containers, databases ');
  lines.push('  indeces, caches, etc. Your app\'s code will be preserved     ');
  lines.push('  locally at ' + app.root + '                                  ');
  lines.push('                                                               ');
  lines.push('  We do recommend that you remove this directory manually.     ');
  lines.push('                                                               ');
  lines.push('###############################################################');

  lines[0] = chalk.yellow(lines[0]);

  lines[2] = chalk.cyan.bold(lines[2]);

  lines[11] = chalk.yellow(lines[11]);

  return lines.join('\n');

};

exports.appStart = function(app) {

  // Start our jam
  var lines = [];

  // Paint a picture
  lines.push('###############################################################');
  lines.push('                                                               ');
  lines.push('                       HOLLA!!!!!!                             ');
  lines.push('                                                               ');
  lines.push('  Your app has started up correctly. Here are some vitals:     ');
  lines.push('                                                               ');
  lines.push('  URL: http(s)://' + app.hostname);
  lines.push('  LOCATION: ' + app.root);
  lines.push('                                                               ');
  lines.push('###############################################################');

  lines[0] = chalk.yellow(lines[0]);

  lines[2] = chalk.cyan.bold(lines[2]);

  lines[9] = chalk.yellow(lines[9]);

  return lines.join('\n');

};

exports.postCreate = function(app) {

  // Start our jam
  var lines = [];

  // Paint a picture
  lines.push('###############################################################');
  lines.push('                                                               ');
  lines.push('                     BOOMSHAKALAKA!                            ');
  lines.push('                                                               ');
  lines.push('  You have created your app with great success! Now you need   ');
  lines.push('  to start that beast up which you can do by navigating to     ');
  lines.push('  ' + app.root + ' and running `kbox start`.                   ');
  lines.push('                                                               ');
  lines.push('  You can also start from another directory by running         ');
  lines.push(' `kbox ' + app.name + ' start`                                 ');
  lines.push('                                                               ');
  lines.push('###############################################################');

  lines[0] = chalk.yellow(lines[0]);

  lines[2] = chalk.cyan.bold(lines[2]);

  lines[11] = chalk.yellow(lines[11]);

  return lines.join('\n');

};

exports.postDestroy = function() {

  // Start our jam
  var lines = [];

  // Paint a picture
  lines.push('###############################################################');
  lines.push('                                                               ');
  lines.push('                 DESTRUCTION COMPLETE                          ');
  lines.push('                                                               ');
  lines.push('###############################################################');

  lines[0] = chalk.yellow(lines[0]);

  lines[2] = chalk.red.bold(lines[2]);

  lines[4] = chalk.yellow(lines[4]);

  return lines.join('\n');

};
