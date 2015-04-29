'use strict';

/**
 * This contains the kalabox shields command.
 */

module.exports = function(kbox) {

  // Easter eggs are soooo cool!
  kbox.tasks.add(function(task) {
    task.path = ['shields'];
    task.description = 'Shield generator operation.';
    task.options.push({
      name: 'status',
      alias: 's',
      description: 'Display shield generator status.'
    });
    task.options.push({
      name: 'webcam',
      alias: 'w',
      description: 'Semi-real time web cam snapshot of the Death Star.'
    });
    task.func = function() {
      if (this.options.status) {
        console.log('Oh I\'m afraid the shield generator' +
          ' is quite operational!!');
      } else if (this.options.webcam) {
        var deathStar =
          '            .          .                     \n' +
          '  .          .                  .          . \n' +
          '        +.           _____  .        .       \n' +
          '    .        .   ,-~"     "~-.               \n' +
          '               ,^ ___         ^. +           \n' +
          '              / .^   ^.         \         .  \n' +
          '             Y  l  o  !          Y  .        \n' +
          '     .       l_ `.___./        _,[           \n' +
          '             |^~"-----------""~ ^|       +   \n' +
          '   +       . !                   !     .     \n' +
          '          .   \                 /            \n' +
          '               ^.             .^            .\n' +
          '                 "-.._____.,-" .             \n' +
          '          +           .                .   + \n' +
          '   +          .             +                \n' +
          '          .             .      .            .';
        console.log(deathStar);
      }
    };
  });

};
