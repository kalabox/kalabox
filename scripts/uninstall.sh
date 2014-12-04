#!/bin/bash

boot2docker stop
boot2docker delete

rm /usr/local/bin/docker
rm /usr/local/bin/boot2docker

rm /usr/local/share/boot2docker/boot2docker.iso
rmdir /usr/local/share/boot2docker

rm -rf ~/.boot2docker
rm ~/.ssh/*boot2docker*

~/Downloads/VirtualBox_Uninstall.tool
