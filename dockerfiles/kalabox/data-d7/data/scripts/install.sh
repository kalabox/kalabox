#!/bin/sh

cd /data/code
rm -rf public
wget http://ftp.drupal.org/files/projects/drupal-7.31.tar.gz
tar -zxf projects/drupal-7.31.tar.gz public
rm drupal-7.31.tar.gz

