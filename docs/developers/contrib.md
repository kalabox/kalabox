Getting Started
===============

You should be able to use this guide to...

1. Install Kalabox from source
2. Learn where all the things are
3. Run the CLI and GUI from source

Installation
------------

For installation you will want both the latest Kalabox development release (to get the latest Kalabox engine running) and the Kalabox source code.

### 1. Install the latest development release

Get the latest Kalabox engine up and running up by installing the latest development release. It's best to just...

1. Grab the [latest development release](./../#development-releases)
2. Follow the normal [installation guide](./../users/install)

### 2. Install the Kalabox source

!!! danger "Requires nodejs 4.2+ and grunt-cli"
    Make sure you [install node](http://nodejs.org) and `npm install -g grunt-cli` before you begin.

We have the latest Kalabox engine but we want to run the CLI and GUI from source
so we can hack on them. Let's grab and install the source.

```bash
git clone https://gith1ub.com/kalabox/kalabox.git && cd kalabox
npm install
```

### 3. Set up a symlink to run the dev version of the Kalabox CLI

This is optional but makes things a lot easier

```bash
# Set up a symlink so you can use `kbox.dev` to run the CLI from source
sudo ln -s /path/to/repo/bin/kbox.js /usr/local/bin/kbox.dev
which kbox.dev
kbox.dev
```

!!! note "Prod and dev side by side"
    This means that you can still run your production CLI `kbox` normally while relying on `kbox.dev` for development.

Code locations
--------------

Here is a general breakdown of where things live inside the Kalabox repo.

```bash
./
|-- bin             CLI entrypoints js scripts
|-- docs            Source markdown files for the documentation you are reading
|-- installer       Installer pkgs and scripts
|-- lib             Core Kalabox libraries (used in both CLI and GUI)
|-- modules         Custom and local node modules
|-- plugins         Core Kalabox plugins
|-- scripts         Scripts to help with CI and building the installers
|-- src             Angular code for the NWJS GUI
|-- tasks           Modularized Grunt tasks
|-- test            CLI, GUI and installer tests
```

Run the CLI and GUI from source
-------------------------------

### CLI

```bash
# If you followed #3 above
kbox.dev

# Or just run the CLI directly with node
node /path/to/repo/bin/kbox.js
```

### GUI

!!! danger "Requires sass be installed"
    Make sure you install sass with `gem install sass` before you begin.

```bash
# Run the GUI from source
grunt gui
```

