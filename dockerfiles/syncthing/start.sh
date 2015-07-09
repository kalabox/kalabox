#!/bin/bash

cp /etc/syncthing/config.xml /data/config.xml

supervisord -n
