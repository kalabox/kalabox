Plugins
=======

Kalabox has an advanced plugin system that allows developers to add and extend Kalabox's core functionality. Here are a few examples of things you can do with plugins:

  1. Implement `kbox create` to provide an easy way for users to generate apps.
  2. Add additional commands to be used with the Kalabox CLI.
  3. Hook into various Kalabox runtime events to provide additional functionality.
  4. Print "A British tar is a soaring soul!" after every app is started.

!!! caution "Can I use plugins to extend the GUI?"
    Not yet. :( Right now there is no distinction between core GUI features, features dedicated to the Pantheon plugin, and features dedicated to the PHP plugin. In the future we hope to de-couple these pieces of functionality to reflect the structure that the Kalabox CLI functionality has obtained.

    See [Remove app specific functionality from GUI and move into app projects](https://github.com/kalabox/kalabox/issues/1393) for updates on progress.

Installation
------------

To get the plugin working with Kalabox do two things:

  1. [Override config](./config) to include your plugin's name.
  2. Place your plugin into the correct location. (see below)

Kalabox looks for plugins in either the `node_modules` or `plugins` folder in three separate locations. If there are multiple instances of the same plugin, Kalabox will load the one found furthest down this list:

  1. The source directory.
  2. Inside of the `sysConfRoot`. For example `/usr/share/kalabox` on Linux.
  3. Inside of the `userConfRoot`. For example `~/.kalabox/` on macOS.

!!! attention "Where are `sysConfRoot` and `userConfRoot`?"
    Run `kbox config` to find the location of these directories as they can be different.

### Example 1: Use the latest version of the "Pantheon on Kalabox" plugin.

Kalabox ships with two external plugins by default: ["Pantheon on Kalabox"](http://github.com/kalabox/kalabox-app-pantheon) and ["PHP on Kalabox"](http://github.com/kalabox/kalabox-app-php). These are installed into your `sysConfRoot` by the Kalabox installer along with a `kalabox.yml` override file. Let's say we want to do development on the "Pantheon on Kalabox" plugin.

```bash
# Go into the `usrConfRoot`; assuming macOS and `~/.kalabox` for this example
cd ~/.kalabox

# Create a plugins folder
mkdir -p plugins
cd plugins

# Get the plugin
git clone https://github.com/kalabox/kalabox-app-pantheon.git
cd kalabox-app-pantheon

# Install its dependencies
npm install
cd app
npm install
```

Now your Kalabox should use the "Pantheon on Kalabox" plugin that is in your `usrConfDir` instead of your `sysConfRoot`.

!!! note "Why don't we need to add our plugins to a `kalabox.yml` file?"
    Since "Pantheon on Kalabox" ships with Kalabox we've already provided an override `kalabox.yml` file that looks for our plugin. Go into your `sysConfRoot` to find it.

