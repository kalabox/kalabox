Updating
========

While Kalabox seeks to minimize breaking changes from version to version we also utilize a lot of new and exciting external dependencies to make our magic. As a result we sometimes cannot ensure a clean and easy update pathway. That said here are the updating guidelines we try to follow...

**Updating between stable patch releases is generally smooth**

This means that *generally* you should be able to [update normally](#normal-updating) from something like `v0.13.3` or `v0.13.5` to `v0.13.7`.

**Updating between minor versions is likely dark and full of peril**

Minor version bumps eg from `v0.12.1` to `v0.13.2` should be considered breaking.

**Updating from a pre-release version is often frought with terror**

Going from any version that is suffixed to another version that is suffixed is likely going to break. For example breaking changes are likely introduced between `v0.13.0-alpha.1` and `v0.13.0-alpha.2`.

Recent Breaking Updates
-----------------------

Here is a list of recent versions of Kalabox that introduce breaking changes. That means that if you have a version below the one listed you will need to [purge and reinstall](#purge-updating) Kalabox.

* `v0.12.0-beta.1`
* `v0.13.0-alpha.1`
* `v0.13.0-beta.2`
* `v0.13.0-rc.2`
* `v2.0.0`
* `v2.1.0`

Normal Updating
---------------

Normal updating if fairly simple.

1. Shutdown the Kalabox GUI and/or kill any running Kalabox CLI process.
2. Follow the [normal installation steps](./install.md) with the new version.

!!! note "Older apps will not be updated!!!"
    If you created apps with a previous version of Kalabox these apps will not be updated. To update your apps we recommend you destroy and recreate those apps.

Purge Updating
--------------

To update to a Kalabox that has breaking changes purge the old installation and install the new one. The easiest way to do this is:

1. Destroy all the apps you have (see [backing up older apps](#backing-up-older-appps))
2. Shutdown the Kalabox GUI and/or kill any running Kalabox CLI processes.
3. Follow the normal [uninstall procedure](./uninstall.md).
4. Follow the [normal installation steps](./install.md) with the new version.

Backing up older apps
---------------------

We recognize that it can be annoying to destroy and recreate apps when you need to upgrade Kalabox. We try to minimize the need for this as much as possible but sometimes this is the easiest upgrade pathway we can recommend.

Luckily, if you are using ["Pantheon on Kalabox"](http://github.com/kalabox/kalabox-app-pantheon) you can push all your local work up to the cloud to easily be pulled back down after you update.
