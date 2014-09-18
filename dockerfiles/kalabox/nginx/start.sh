#!/bin/sh

PHP_HOST=$(dig +short php.${APPDOMAIN})
sed -i "s/fastcgi_pass .*/fastcgi_pass ${PHP_HOST}:9000;/g" /data/config/nginx/site.conf

nginx