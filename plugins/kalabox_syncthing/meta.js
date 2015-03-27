'use strict';

module.exports = {
  SYNCTHING_DOWNLOAD_URL: {
    darwin: 'https://github.com/syncthing/syncthing/releases/download/' +
      'v0.10.21/syncthing-macosx-amd64-v0.10.21.tar.gz',
    win32: 'https://github.com/syncthing/syncthing/releases/download/' +
      'v0.10.21/syncthing-windows-amd64-v0.10.21.zip',
    linux: ''
  },
  SYNCTHING_CONFIG_URL: 'https://raw.githubusercontent.com/kalabox/' +
    'kalabox-dockerfiles/master/syncthing/config.xml'
};
