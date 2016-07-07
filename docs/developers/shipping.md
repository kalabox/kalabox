Shipping
========

We have `grunt` commands to easily package and ship Kalabox for release.

Building
--------

!!! note "Cross compiling is not currently supported"
    Due to an upstream restriction imposed on us by `jxcore` we cannot cross compile.

```bash
# Package the Kalabox CLI into a binary
grunt pkg:cli
cd dist/cli

# Package the Kalabox GUI
grunt pkg:gui
cd dist/gui

# Package both the CLI and GUI into an installer
grunt pkg
cd dist
```

Rolling a release
-----------------

!!! attention "Test installers first"
    Until our CI can run cross platform installer tests it's recommended to [run these tests manually](./testing/#installer-tests) before rolling a new release.

If you are an administrator of the Kalabox repo you can push various releases using the following...

```bash
# Do a minor ie 0.x.0 bump and push a release
grunt release --dry-run
grunt release

# Do a patch ie 0.0.x bump and push a release
grunt patch --dry-run
grunt patch

# Do a prerelease ie 0.0.0-alpha.x bump and push a release
grunt prerelease --dry-run
grunt prerelease
```
