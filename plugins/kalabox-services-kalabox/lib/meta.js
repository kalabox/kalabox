'use strict';

module.exports = function(kbox) {

  var deps = kbox.core.deps;

  return {
    SERVICE_IMAGES_VERSION: '0.10.6',
    resolverPkg: {
      debian: {
        'default': 'debian8-0-libnss-resolver_0.3.0_amd64.deb',
        '7': 'debian8-0-libnss-resolver_0.3.0_amd64.deb',
        '8': 'debian8-0-libnss-resolver_0.3.0_amd64.deb'
      },
      ubuntu: {
        'default': 'ubuntu12-libnss-resolver_0.3.0_amd64.deb',
        '12.04': 'ubuntu12-libnss-resolver_0.3.0_amd64.deb',
        '12.10': 'ubuntu12-libnss-resolver_0.3.0_amd64.deb',
        '13.04': 'ubuntu12-libnss-resolver_0.3.0_amd64.deb',
        '13.10': 'ubuntu12-libnss-resolver_0.3.0_amd64.deb',
        '14.04': 'ubuntu14-libnss-resolver_0.3.0_amd64.deb',
        '14.10': 'ubuntu14-libnss-resolver_0.3.0_amd64.deb',
        '15.04': 'ubuntu15-libnss-resolver_0.3.0_amd64.deb',
        '15.10': 'ubuntu15-libnss-resolver_0.3.0_amd64.deb'
      },
      fedora: {
        'default': 'fedora20-libnss-resolver-0.3.0-1.x86_64.rpm',
        '20': 'fedora20-libnss-resolver-0.3.0-1.x86_64.rpm',
        '21': 'fedora20-libnss-resolver-0.3.0-1.x86_64.rpm',
        '22': 'fedora20-libnss-resolver-0.3.0-1.x86_64.rpm',
        '23': 'fedora23-libnss-resolver-0.3.0-1.x86_64.rpm'
      },
    },
    dns: {
      darwin: {
        path: '/etc/resolver',
        file: deps.lookup('globalConfig').domain
      },
      linux: {
        debian: {
          path: '/etc/resolver',
          file: deps.lookup('globalConfig').domain
        },
        fedora: {
          path: '/etc/resolver',
          file: deps.lookup('globalConfig').domain
        }
      }
    }
  };

};
