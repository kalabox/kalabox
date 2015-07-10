#!/bin/bash

cp /etc/syncthing/config.xml /syncthing/config.xml

supervisord -n
