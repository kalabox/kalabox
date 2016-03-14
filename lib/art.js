/**
 * Some hawt ASCII art for Kalabox
 *
 * @name art
 */

'use strict';

var chalk = require('chalk');

/**
 * Document
 */
exports.needsInstall = function() {

  // Start our jam
  var lines = [];

  // Paint a picture
  lines.push('###############################################################');
  lines.push('                                                               ');
  lines.push('                 WHERE IS EVERYTHING!?!?!                      ');
  lines.push('                                                               ');
  lines.push(' Cannot detect a working Kalabox environment!                  ');
  lines.push('                                                               ');
  lines.push(' We need to install some special things to make sure you are   ');
  lines.push(' good to go. Please download the Kalabox Installer and make    ');
  lines.push(' sure you have completed the installation process.             ');
  lines.push('                                                               ');
  lines.push('###############################################################');

  lines[0] = chalk.yellow(lines[0]);

  lines[2] = chalk.red.bold(lines[2]);

  lines[4] = chalk.green(lines[4]);
  lines[5] = chalk.green(lines[5]);
  lines[6] = chalk.green(lines[6]);
  lines[7] = chalk.green(lines[7]);
  lines[8] = chalk.green(lines[8]);

  lines[10] = chalk.yellow(lines[10]);

  return lines.join('\n');

};

/**
 * Document
 */
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

/**
 * Document
 */
exports.appStart = function(app) {

  // Start our jam
  var lines = [];

  // Paint a picture
  lines.push('###############################################################');
  lines.push('                                                               ');
  lines.push('                    BOOMSHAKALAKA!                             ');
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

/**
 * Document
 */
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
