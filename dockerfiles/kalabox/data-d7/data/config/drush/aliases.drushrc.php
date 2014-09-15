<?php
$aliases['dev'] = array(
  'uri' => 'localhost',
  'root' => '/data/code/public',
  'databases' =>
    array (
      'default' =>
        array (
          'default' =>
            array (
              'driver' => 'mysql',
              'username' => 'root',
              'password' => '',
              'port' => 3306,
              'host' => $_SERVER['DB_PORT_3306_TCP_ADDR'],
              'database' => 'kalabox',
            ),
        ),
    ),
);