Contributing to Kalabox
=======================

Creating Issues
---------------

**ALL ISSUES** for the Kalabox should be created on the main Kalabox
project page: https://github.com/kalabox/kalabox/issues

Once you create an issue please follow the guidelines that are posted as the
first comment on your.

Issue tags
----------

Here is a list of the tags we use on our issues and what each means.

#### Issue tags

* **bug fix** - The issue indicates a buggy feature that needs to be fixed.
* **duplicate** - The issue is expressed already elsewhere.
* **enhancement** - The issue wishes to improve a pre-existing feature.
* **feature** - The issue contains new proposed functionality.
* **task** - The issue is a non-development related task such as documentation.

#### Kalabox tags

* **cli** - The issue manifested using the cli.
* **gui** - The issue manifested using the gui.
* **installer** - The issue manifested using the installer.

#### Additional tags

* **sprint ready** - The issue is in a good state for action.
* **blocker** - The issue is currently blocking the completion of other issues.
* **Epic** - The issue acts as a container for other issues.

Epic Guidelines
---------------

An issue should be expressed as an epic if it satisfies the following two
critera

1. A feature which is best expressed as more than one issue.
2. Each sub-issue is shippable by itself.

Contributing to other Kalabox projects
--------------------------------------

The rest of this guide is dedicated to working on the installer portion of
Kalabox. If you are actually interesting in working on other Kalabox projects
please check out their respective CONTRIBUTION.mds.

* [kalabox-cli](https://github.com/kalabox/kalabox-cli/blob/HEAD/CONTRIBUTING.md)
* [kalabox-ui](https://github.com/kalabox/kalabox-ui/blob/HEAD/CONTRIBUTING.md)
* [kalabox-app-php](https://github.com/kalabox/kalabox-app-php/blob/HEAD/CONTRIBUTING.md)
* [kalabox-app-pantheon](https://github.com/kalabox/kalabox-app-pantheon/blob/HEAD/CONTRIBUTING.md)

Setting Up for Development
--------------------------

#### 1. Install Docker tools

Installers are built using Docker, so you'll need a Docker host set up. For example, using [Docker Machine](https://github.com/docker/machine):

```bash
$ docker-machine create -d virtualbox installer
$ eval "$(docker-machine env installer)"
```

#### 2. Build installers

Then to build the installer

```bash
# Get the code
git clone https://github.com/kalabox/kalabox.git

# Builds for all platforms
make

# Builds for OSX
make osx

# Builds for Windows
make windows

# Builds for .deb/.rpm
make linux
```

The resulting installers will be in the `dist` directory.

Testing
-------

We have some basic tests you can run locally. For these test you will
want to have node, npm and grunt installed. Right now tests are OS
specific and can only be run locally due to VirtualBox inception problems on
Travis.

#### Running Tests

Run all the tests via:

```bash
# Get the code
git clone https://github.com/kalabox/kalabox.git
cd kalabox
npm install

# Run the tests for my OS
grunt test
```

#### Writing Tests

Tests are included in the "test" folders. Most of the tests are written using
the BATS testing framework. Windows tests are a little more ... cavalier.

Looking at existing tests will give you a good idea of how to write your own,
but if you're looking for more tips, we recommend:

- [BATS wiki](https://github.com/sstephenson/bats)
- [BATS tutorial](https://blog.engineyard.com/2014/bats-test-command-line-tools)

Note that, since we've done most of the heavy lifting via the grunt tast you
shouldn't have to setup bats or perform any of the other
setup tasks in the tutorial.

Submitting Fixes
----------------

Perform all of your work in a forked branch of kalabox, preferably named in the
convention `[issue number]-some-short-desc`. Please also prefix your commits
with a relevant issue number if applicable ie

`#314: Adding pi to list of known trancendental numbers`

When you feel like your code is ready for review open a pull request against
the kalabox repository. The pull request will auto-generate a checklist
of things you need to do before your code will be considered merge-worthy.

Please always reference the main Kalabox issue in your commit messages and pull
requests using the kalabox/kalabox#[issue number] syntax.
