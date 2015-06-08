'use strict';

module.exports = {
  SYNCTHING_DOWNLOAD_URL: {
    darwin: 'https://github.com/syncthing/syncthing/releases/download/' +
      'v0.11.6/syncthing-macosx-amd64-v0.11.6.tar.gz',
    win32: 'https://github.com/syncthing/syncthing/releases/download/' +
      'v0.11.6/syncthing-windows-amd64-v0.11.6.zip',
    linux: 'https://github.com/syncthing/syncthing/releases/download/' +
      'v0.11.6/syncthing-linux-amd64-v0.11.6.tar.gz'
  },
  SYNCTHING_CONFIG_URL: 'https://raw.githubusercontent.com/kalabox/' +
    'kalabox/master/dockerfiles/syncthing/config.xml'
};
