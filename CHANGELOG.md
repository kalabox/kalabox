# Changelog

## 0.7.0 (2015-5-8)

Kbox create/rebuild/update, app models, syncthing 0.11.0, fun

- Created `kbox update` command to upgrade app dependencies
- Created `kbox rebuild` command to rebuild an apps containers
- Created Titanic functional testing framework
- Created `kbox create` to auto-spin up apps of a certain type
- Provided Drupal and Backdrop apps
- Upgraded to syncthing 0.11.0
- Fixed CI to only deploy from node 0.12.x
- Changed `kbox apps` to print more detailed info
- Simplified kbox.require
- Added script for finding out which node modules take the longest to load.
- Improved performance of require
- Removed some old unit tests
- Improved display of task menu for an app
- Improved install to correctly prompt for password based on GUI or CLI
- Provided a disk-size option for provision
- Fixed handling of unbubbled errors
- Moved syncthing dockerfile to core
- Provided build-local option to build containers from local sources
- Provided auto-decorating of image options
- Moved `kbox shields` to its own plugin
- Changed syncthing interval to 2 seconds
- Swapped out core fs for fs-extra
- Fixed bug where deps.register was not working for 'app'
- FIxed bug where an app path that started with another app path failed
- Moved data container to core and handled behind the scene
- Updated data container volumes
- Created new kbox event for all container creates
- Reworked core dockerfiles
- Removed bugs and made all the things smarter

## 0.6.0 (2015-4-14)

Kbox provision as updater, better task framework and bug fixes

- Created `kbox shields` command
- Allowed versions of backends to be specified in config
- Refactored how we load backends and plugin deps
- Created npm util module to
- Added in prompt to kick off `kbox provision`
- Reached 1000 commits!!!
- Refactored tasks to use new task framework
- Stopped winston from throwing errors
- Fixed invalid command path bug in cli menu
- Fixed missing return in taskNew
- Changed provision to run updates on second run
- Cleaned and refactored plugins and provision code
- Created better framework for tasks
- Provided framework for future `kbox update` command.
- Fixed bug where syncthing failed when running two or more apps
- Fixed bug calculating the number of install steps

## 0.5.0 (2015-3-27)

Moved to new installer framework

- Refactored installer to use new installer framework
- Simplified plugins
- Moved install steps into relevant projects ie syncthing/engine/services

## 0.4.0 (2015-3-24)

Bug fixes and external backends for services and engine

- Refactored plugins to handle external backends
- Moved docker engine and kalabox services into their own projects
- Provided sharing on/off option in global config file
- Simplified plugin function signatures to just kbox and app
- Allow syncthing to ignore patterns specified in app kalabox.json
- Refactored core plugins to be more modular
- Added additional methods to engine including interactive mode
- Added basic installer framework to be implemented in 0.5.0
- Removed resolvconf entries on linux uninstall
- Added global config overrides via source kalabox.json
- Added kbox version command
- Added support for vanity DNS suffixes
- Moved code directory to live inside of an app
- Added better DNS handling on linux
- Improved error handling and logging
- Added version and OS info to logging
- Support home directories on external volumes or that are encrypted
- Updated CI to run on node 10/11/12
- Changed syncthing to use non standard port for GUI
- Removed bugs and made all the things smarter

## 0.3.0 (2015-2-25)

First pass on interfaces, APIs and other various abstractions

- Provided more flexible app discovery
- Added back support for external plugins
- Fixed issues for user folder binding on Windows and Linux
- Added more legit logging with Winston
- Created uninstallers for Windows and Linux
- Fixed a bug where the b2d.iso was stored in tmp and thus eventually deleted
- Stubbed out installers for Linux and Windows
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
