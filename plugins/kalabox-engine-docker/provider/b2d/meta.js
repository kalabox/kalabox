'use strict';

module.exports = {
  PROVIDER_PROFILE_VERSION: '0.10.0',
  PROVIDER_PROFILE_URL: 'https://raw.githubusercontent.com/' +
    'kalabox/kalabox-boot2docker/master/profile',
  PROVIDER_INF_VERSION: '0.10.0',
  PROVIDER_INF_URL: 'https://raw.githubusercontent.com/kalabox/' +
    'kalabox-boot2docker/master/b2d.inf',
  PROVIDER_VB_VERSION: '5.0.2',
  PROVIDER_B2D_VERSION: '1.8.0',
  PROVIDER_B2D_ISO: '1.9.1',
  PROVIDER_DOWNLOAD_URL: {
    linux: {
      vb: {
        debian: {
          'deps': [],
          'packages': ['virtualbox-5.0'],
          'source': 'http://download.virtualbox.org/virtualbox/debian',
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
            'kernel-headers',
            'kernel-devel',
            'dkms'
          ],
          'packages': [
            'VirtualBox-5.0'
          ],
          'source': 'http://download.virtualbox.org/virtualbox/rpm/fedora/' +
            'virtualbox.repo',
          'source-file': '/etc/yum.repos.d/kalabox.repo',
          'key': '',
          'recompile': '/usr/lib/virtualbox/vboxdrv.sh setup'
        }
      },
      b2d: 'https://github.com/boot2docker/boot2docker-cli/releases/download/' +
        'v1.8.0/boot2docker-v1.8.0-linux-amd64'
    },
    win32: {
      b2d: 'https://github.com/boot2docker/windows-installer/releases/' +
      'download/v1.8.0/docker-install.exe'
    },
    darwin: {
      b2d: 'https://github.com/boot2docker/osx-installer/releases/download/' +
      'v1.8.0/Boot2Docker-1.8.0.pkg'
    }
  }
};
