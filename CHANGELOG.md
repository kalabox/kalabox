# Changelog

## 0.3.0 (2015-2-14)

First pass on interfaces, APIs and other various abstractions

- Reorganized and simplified libraries
- Added interfaces for "engine", "provider" and "services"
- Added docker engine, b2d provider and core kalabox services.
- First pass on syncthing "sharing" for near-native-performance file sharing
- Node wrapper for syncthing
- Fixed bug where old cached b2d.iso is used instead of latest
- Removed initial NFS implementation because F that noise
- Added syncthing container to services and installer
- Use "stable" releases for kalabox-dockerfiles
- Increased container start delay for now
- Reverted to strict google jscs
- Implemented "production" hipache config
- Added better docs that auto deploy to api.kalabox.me
- Removed legacy code and unit tests
- Switched to standard local 10.*.*.* addresses to not piss of the PRC
- Dynamically set relevant IPs with new engineConfig
- Fixed bug when trying to create container that already exists
- Changed global install to "provision" for now.
- Added coverage.kalabox.me and ci.kalabox.me for contributors.
- Added core events module to handle events async stylee
- Use non-standard redis port to reduce potential collisions
- Removed bugs and made all the things smarter

## 0.2.0 (2014-12-22)

Core functionality stubs

- Cleaned up some unused files
- Better error handling
- Stubbed out MacOSX installer
- Stubbed out handling of "System Services"
- Global and overrideable config system
- Simplified app discovery for now
- Minimized "System Service" image sizes
- Dependency injection framework
- Autopublish to NPM
- Argument handling framework
- Task object and tree
- Node wrapper for Boot2Docker
- kbox up and down commands
- Minimized system impact for B2D usage

## 0.1.0 (2014-11-03)

Initial public release

- Proof of concept for
  - Basic docker orchestration
  - Running on OSX/Linux
  - Plugin system
  - Tests, builds, deploys
  - Apps
