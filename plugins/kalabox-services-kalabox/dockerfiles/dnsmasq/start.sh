#!/bin/sh

sed -i "s/KALABOX_DOMAIN\/KALABOX_IP/$KALABOX_DOMAIN\/$KALABOX_IP/g" /etc/dnsmasq.conf

/usr/sbin/dnsmasq -d
