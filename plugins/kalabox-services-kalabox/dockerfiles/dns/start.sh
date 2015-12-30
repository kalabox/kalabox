#!/bin/sh

sed -i "s/DOMAIN\/IP/$DOMAIN\/$IP/g" /etc/dnsmasq.conf

/usr/sbin/dnsmasq -d
