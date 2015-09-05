'use strict';

/**
 * Soem pics and stuff
 * @module kbox.art
 */

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
