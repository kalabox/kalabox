v.13.0-rc.1
=============

* Switched `kbox status` on `linux` to use PID file existence instead of `service` wrapper. [#1539](https://github.com/kalabox/kalabox/issues/1539)
* Provided a check to ensure the `docker` daemon is up on Windows and OSX. [#1387](https://github.com/kalabox/kalabox/issues/1387)
* Simplified `osx` uninstall script and made it clickable. [#1361](https://github.com/kalabox/kalabox/issues/1361)
* Updated to latest stable releaes of `engine`, `compose`, `machine` and `virtualbox`. [#1361](https://github.com/kalabox/kalabox/issues/1361)
* Added a weak check to warn the user if an app is possibly in a bad state. [#1542](https://github.com/kalabox/kalabox/issues/1542)
* Improved `kbox start` so it waits until site returns `200 OK` before indicating site is up. [#1543](https://github.com/kalabox/kalabox/issues/1543)

v.13.0-beta.4
=============

* Loosened default `unison` ignore patterns. [#1501](https://github.com/kalabox/kalabox/issues/1501)
* Bumped `stdin` max listeners to suppress `EventEmitter` warning. [#1502](https://github.com/kalabox/kalabox/issues/1502)
* Better user feedback when running `kbox start` and `kbox stop`. [#955](https://github.com/kalabox/kalabox/issues/955)
* Added a `force` option to `kbox start` and `kbox stop`. [#955](https://github.com/kalabox/kalabox/issues/955)
* Expanded `services` plugin to handle multiple subdomains and custom URLs. [#1182](https://github.com/kalabox/kalabox/issues/1182) [#1485](https://github.com/kalabox/kalabox/issues/1485)
* Fixed upgrade pathway on `debian`. [#1506](https://github.com/kalabox/kalabox/issues/1506)
* Fixed `kbox` engine commands like `up`, `down` and `status` to work correctly on Linux. [#1375](https://github.com/kalabox/kalabox/issues/1375)
* Removed empty menu in `win32` and `linux`. [#1521](https://github.com/kalabox/kalabox/issues/1521)
* Added an option to refresh the list of Pantheon sites to the GUI. [#1510](https://github.com/kalabox/kalabox/issues/1510)
* Set default Pantheon create `env` to `dev` in GUI. [#1365](https://github.com/kalabox/kalabox/issues/1365)
* Fixed and improved site `url` listing in GUI Site Connection Info Modal. [#1492](https://github.com/kalabox/kalabox/issues/1492)

v.13.0-beta.3
=============

* Clarified which uninstaller should be used. [#1490](https://github.com/kalabox/kalabox/issues/1490)
* Fixed permission error on OSX that caused "The application “Kalabox” can’t be opened" [#1477](https://github.com/kalabox/kalabox/issues/1477)
* Fixed `unison` on Windows. This resolves the `*.tmp` directory problem. [#1484](https://github.com/kalabox/kalabox/issues/1484)
* Removed `dns host resolver` setting to improve DNS response time on Windows [#1487](https://github.com/kalabox/kalabox/issues/1487)

v.13.0-beta.2
=============

* Rebooted our documentation [#1322](https://github.com/kalabox/kalabox/issues/1322)
* Improved `kbox env` description [#1373](https://github.com/kalabox/kalabox/issues/1373)
* Fixed Kalabox complaining about the `appRegistry.json.lock` file [#1426](https://github.com/kalabox/kalabox/issues/1426)
* Ensured `dns` and `proxy` are running before a `kbox start` and `kbox stop` [#1294](https://github.com/kalabox/kalabox/issues/1294)
* Added ability to optimize `unison` file sharing by ignoring or targeting specific paths. [#1440](https://github.com/kalabox/kalabox/issues/1440)
* Improved logging by reducing noise, adding color and separated `debug` and `verbose` better.
* Fixed bug on Linux where adding services to `kalabox_proxy` was failing. [#1351](https://github.com/kalabox/kalabox/issues/1351)
* Fixed bug on Linux where `kbox services` would sometimes not return all the services. [#1429](https://github.com/kalabox/kalabox/issues/1429)
* Fixed bug where Windows latest dev release was not avaialable to the public by default.
* Upgraded Windows and OSX to [VirtualBox 5.0.26](https://www.virtualbox.org/wiki/Download_Old_Builds_5_0)
* Improved `app.isRunning` to filter out any `autostart` services.
* Improved handling of app state to remove the "token" docker containers. Should improve app start speed and general GUI experience. [#1451](https://github.com/kalabox/kalabox/issues/1451)
* Fixed bug where `mode` was not set as a dependency in our tests.
* Fixed bug on OSX where `.docker` had the wrong permissions, causing install failure
* Fixed bug where GUI initialize screen would persist indefinitely on Windows [#1435](https://github.com/kalabox/kalabox/issues/1435)

v0.13.0-alpha.1
===============

* Moved `kalabox-app-pantheon` and `kalabox-app-php` from `srcRoot` to `sysConfRoot`. [#1407](https://github.com/kalabox/kalabox/issues/1407)
* Simplified OSX packge so most assets are within `Kalabox.app` bundle. [#1406](https://github.com/kalabox/kalabox/issues/1406)
* Removed `syncthing` in favor of `unison`. [#1374](https://github.com/kalabox/kalabox/issues/1374)
* Fixed GUI memory leak. [#1368](https://github.com/kalabox/kalabox/issues/1368)
* Removed legacy DNS options. [#1330](https://github.com/kalabox/kalabox/issues/1330)
* Fixed issue where Kalabox apps would not work while offline [#1227](https://github.com/kalabox/kalabox/issues/1227)
* Fixed CLI falsely reporting "Where is everything!?!?!" on Windows [#1348](https://github.com/kalabox/kalabox/issues/1348)
* Removed usage of {userdocs} for {localappdata} in Windows installer [#1186](https://github.com/kalabox/kalabox/issues/1186)
* Simplified Windows installer [#1245](https://github.com/kalabox/kalabox/issues/1245)
* Fixed issue where Kalabox apps would not work while offline. [#1227](https://github.com/kalabox/kalabox/issues/1227)
* Fixed TRAVIS_TAG=latest-dev triggering GitHub deployment. [#1412](https://github.com/kalabox/kalabox/issues/1412)
* Simplified debian and fedora installers. [#1408](https://github.com/kalabox/kalabox/issues/1408)
* Merged `kalabox-ui` and `kalabox-cli` into this repo. [#1357](https://github.com/kalabox/kalabox/issues/1357)
