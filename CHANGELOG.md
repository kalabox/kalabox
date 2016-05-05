v0.12.0-beta1
==================

#### Bug Fixes

* Changed `uninstall.tool` to `uninstall.sh` [#1246](https://github.com/kalabox/kalabox/issues/1246)

v0.12.0-alpha4
==================

#### Enhancements

* Improved deploy to push dev and prod releases [#1267](https://github.com/kalabox/kalabox/issues/1267)

#### New Features

* Updated our development process with new contribution guidelines and standards [#1236](https://github.com/kalabox/kalabox/issues/1236)
* Added a testing framework for the installer [#1267](https://github.com/kalabox/kalabox/issues/1267)

#### Bug fixes

* Added all [registered Desktop Environments](https://standards.freedesktop.org/menu-spec/latest/apb.html) so that Kalabox has the best chance of showing up in the app menu and [appended to the Category list](https://standards.freedesktop.org/menu-spec/latest/ar01s03.html) "Development" [#1272](https://github.com/kalabox/kalabox/issues/1272)
* Fixed small bug where Kalabox install was failing on Travis [#1247](https://github.com/kalabox/kalabox/issues/1247)
* Switched dependency on `cgroup-lite` to `cgroup-bin` for better debian based linux compatibility. [#1206](https://github.com/kalabox/kalabox/issues/1206)
