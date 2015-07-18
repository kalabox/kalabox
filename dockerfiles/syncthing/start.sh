#!/bin/bash

cp -n /etc/syncthing/config.xml /syncthing/config.xml

supervisord -n
