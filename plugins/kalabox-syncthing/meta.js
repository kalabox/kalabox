'use strict';

module.exports = {
  SYNCTHING_BINARY: '0.11.25',
  SYNCTHING_IMAGE: '0.11.25',
  SYNCTHING_CONFIG: '0.10.3',
  SYNCTHING_DOWNLOAD_URL: {
    darwin: 'https://github.com/syncthing/syncthing/releases/download/' +
      'v0.11.25/syncthing-macosx-amd64-v0.11.25.tar.gz',
    win32: 'https://github.com/syncthing/syncthing/releases/download/' +
      'v0.11.25/syncthing-windows-amd64-v0.11.25.zip',
    linux: 'https://github.com/syncthing/syncthing/releases/download/' +
      'v0.11.25/syncthing-linux-amd64-v0.11.25.tar.gz'
  },
  SYNCTHING_CONFIG_URL: 'https://raw.githubusercontent.com/kalabox/' +
    'kalabox/v0.10/dockerfiles/syncthing/config.xml'
};
