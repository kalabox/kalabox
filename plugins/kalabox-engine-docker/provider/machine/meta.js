'use strict';

// Constants
var PROVIDER_VB_VERSION = '5.0.10';
var PROVIDER_KALABOX_ISO = '1.9.1';
var PROVIDER_MACHINE_VERSION = '0.5.4';
var PROVIDER_COMPOSER_VERSION = '1.5.2';
var PROVIDER_MSYSGIT_VERSION = 'Git-1.9.5-preview20150319';

// Docker things
var DOCKER_URL = 'https://github.com/docker/';
var MACHINE_DOWNLOADS = DOCKER_URL + 'machine/releases/download/';
var COMPOSE_DOWNLOADS = DOCKER_URL + 'compose/releases/download/';
var MACHINE_VERSION = 'v' + PROVIDER_MACHINE_VERSION + '/';
var COMPOSE_VERSION = PROVIDER_COMPOSER_VERSION + '/';
var MACHINE_URL = MACHINE_DOWNLOADS + MACHINE_VERSION;
var COMPOSE_URL = COMPOSE_DOWNLOADS + COMPOSE_VERSION;

// VirtualBox things
var VB_DOWNLOADS = 'http://download.virtualbox.org/virtualbox/';
var VB_URL = VB_DOWNLOADS + PROVIDER_VB_VERSION + '/';

// Git thing
var GIT_DOWNLOADS = 'https://github.com/msysgit/msysgit/releases/download/';
var GIT_URL = GIT_DOWNLOADS + PROVIDER_MSYSGIT_VERSION + '/';

module.exports = {
  PROVIDER_VB_VERSION: PROVIDER_VB_VERSION,
  PROVIDER_KALABOX_ISO: PROVIDER_KALABOX_ISO,
  PROVIDER_MSYSGIT_VERSION: PROVIDER_MSYSGIT_VERSION,
  PROVIDER_MACHINE_VERSION: PROVIDER_MACHINE_VERSION,
  PROVIDER_DOWNLOAD_URL: {
    linux: {
      vb: {
        debian: {
          'deps': [],
          'packages': ['virtualbox-5.0'],
          'source': VB_DOWNLOADS + 'debian',
          'source-file': '/etc/apt/sources.list.d/kalabox.list',
          'key': 'https://www.virtualbox.org/download/oracle_vbox.asc',
          'recompile': '/etc/init.d/vboxdrv setup'
        },
        fedora: {
          'deps': [
            'binutils',
            'qt',
            'gcc',
            'make',
            'patch',
            'libgomp',
            'glibc-headers',
            'glibc-devel',
            'kernel-headers-$(uname -r)',
            'kernel-devel-$(uname -r)',
            'dkms'
          ],
          'packages': [
            'VirtualBox-5.0'
          ],
          'source': VB_DOWNLOADS + '/rpm/fedora/virtualbox.repo',
          'source-file': '/etc/yum.repos.d/kalabox.repo',
          'key': '',
          'recompile': '/usr/lib/virtualbox/vboxdrv.sh setup'
        }
      },
      machine: MACHINE_URL + 'docker-machine_linux-amd64',
      compose: COMPOSE_URL + 'docker-compose-Linux-x86_64'
    },
    win32: {
      vb: VB_URL + 'VirtualBox-5.0.10-104061-Win.exe',
      machine: MACHINE_URL + 'docker-machine_windows-amd64.exe',
      compose: COMPOSE_URL + 'docker-compose-Windows-x86_64.exe',
      msysgit: GIT_URL + PROVIDER_MSYSGIT_VERSION + '.exe'
    },
    darwin: {
      vb: VB_URL + 'VirtualBox-5.0.10-104061-OSX.dmg',
      machine: MACHINE_URL + 'docker-machine_darwin-amd64',
      compose: COMPOSE_URL + 'docker-compose-Darwin-x86_64'
    }
  }
};
