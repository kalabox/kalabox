<?php
/**
 * This file is automatically updated by kalabox-plugin-drush.
 */
$aliases['dev'] = array(
  'uri' => 'localhost',
  'root' => '/src/public',
  'databases' =>
    array (
      'default' =>
        array (
          'default' =>
            array (
              'driver' => 'mysql',
              'username' => 'kalabox',
              'password' => '',
              'port' => 3306,
              'host' => 'app.kbox',
              'database' => 'kalabox',
            ),
        ),
    ),
);