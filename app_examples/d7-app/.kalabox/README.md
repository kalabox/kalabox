## Kalabox Drupal 7 Profile

Your app will be mounted into each container at `/src`.

Services used in this profile have been setup to read their
config files from `/src/.kalabox/config`.

For example, within the context of the PHP container,
`/etc/php5/fpm/php.ini` is symlinked from `/src/.kalabox/config/php/php.ini`.

This allows you to modify the files right from your source code.

For services requiring a restart after modifying configurations, simply
restart your kalabox app. `kbox stop && kbox start`.
