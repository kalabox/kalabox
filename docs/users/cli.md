Kalabox CLI
===========

The Kalabox CLI is accessible via your terminal by typing `kbox` at the prompt, which will display the list of commands you can run. Kalabox operates in one of two contexts:

  * **Global** - This is any directory that does not contain a Kalabox app.
  * **App** - This is any directory which does contain an app.

The context will determine the list of commands you can run. If you have app context then the commands you run will apply to the app. In the example above Kalabox is running in an app context. You will see that Kalabox will group the commands into seperate contexts for you.

!!! tip "Easily switch contexts"
    If you are in a different app or global context you can easily run a command against another app using the `kbox <APPNAME> command` syntax.

config
------

Prints out the currently active Kalabox configuration. If you are inside of an app context, Kalabox will merge your app config into your global config.

`kbox config`

```bash
Options:
  -h, --help     Display help message.                                 [boolean]
  -v, --verbose  Use verbose output.                                   [boolean]
  -d, --debug    Use debug output.                                     [boolean]
```

create
------

Automatically generates apps using a special kind of app-generating plugins like the [Pantheon](http://pantheon.kalabox.io) and [PHP](http://php.kalabox.io) plugins. The user gets a nice CLI questionnaire or GUI pointy-clicky workflow and then the commands builds out your app. This command can only be run from a global context.

`kbox create`

See the plugin-specific documentation for how the [Pantheon plugin](http://pantheon.kalabox.io) and the [PHP plugin](http://php.kalabox.io) implement this command.

destroy
-------

Completely removes an app and its code. This means that after you run this command the containers, services, tooling and all local files for this app will be gone. You need to have an app context to run this command.

`kbox destroy`

```bash
Options:
  -h, --help     Display help message.                                 [boolean]
  -v, --verbose  Use verbose output.                                   [boolean]
  -d, --debug    Use debug output.                                     [boolean]
  -y, --yes      Automatically answer affirmitive                      [boolean]
```

```bash
# Destroy an app without a confirmation prompt
cd /to/app1
kbox destroy -- -y

# Destroy another app with a confirmation prompt
kbox app2 destroy
```

!!! attention "Only destroys an app, not Kalabox itself!"
    This command should not be confused with uninstalling Kalabox. It **will only** destroy the app that you use it on.

env
---

Prints out a list of environmental variables that Kalabox sets dynamically. This list will be different depending on whether you are in a global or app context. Some apps, such as Pantheon apps, will add additional variables for you to use.

`kbox env`

```bash
Options:
  -h, --help     Display help message.                                 [boolean]
  -v, --verbose  Use verbose output.                                   [boolean]
  -d, --debug    Use debug output.                                     [boolean]
```

list
----

Prints a JSON object of your apps with some summary information about them. Runs from either an app or global context.

`kbox list`

```bash
Options:
  -h, --help     Display help message.                                 [boolean]
  -v, --verbose  Use verbose output.                                   [boolean]
  -d, --debug    Use debug output.                                     [boolean]
  -n, --names    Only display app names.                               [boolean]
```

rebuild
-------

Completely rebuilds the containers and services you use to run your app. This command is great for developing, tweaking or updating your app. You need to have an app context to run this command.

`kbox rebuild`

```bash
Options:
  -h, --help     Display help message.                                 [boolean]
  -v, --verbose  Use verbose output.                                   [boolean]
  -d, --debug    Use debug output.                                     [boolean]
```

```bash
# Rebuild my app with verbose mode on so I can see WTF is happening!
kbox rebuild -- -v
```

!!! danger "Be careful using this command! It rebuilds EVERYTHING"
    If you have application data or code stored in a web or database container, this data will be lost as well unless you have properly volumed it or written a plugin to ensure the data sensitive container is not included in the rebuild.

    For example, the [Pantheon](http://github.com/kalabox/kalabox-app-pantheon) and [PHP](http://github.com/kalabox/kalabox-app-php) plugins store all application data in a `data` container which is preserved through a rebuild.

restart
-------

Stops and then starts an app. You need to have an app context to run this command.

`kbox restart`

```bash
Options:
  -h, --help     Display help message.                                 [boolean]
  -v, --verbose  Use verbose output.                                   [boolean]
  -d, --debug    Use debug output.                                     [boolean]
```

!!! tip "Good to resolve random issues"
    Sometimes if your Kalabox is giving you a tough go, doing a simple restart can flush out the issue.

services
--------

Displays relevant connection information for your apps services. Like `kbox create` this command also must be implemented by the app itself.

`kbox create`

See the plugin-specific documentation for how the [Pantheon plugin](http://pantheon.kalabox.io) and the [PHP plugin](http://php.kalabox.io) implement this command.

start
-----

Start an app. It will also build the app if this is the first time you've started it. You need to have an app context to run this command. You need to have an app context to run this command.

`kbox start`

```bash
Options:
  -h, --help     Display help message.                                 [boolean]
  -v, --verbose  Use verbose output.                                   [boolean]
  -d, --debug    Use debug output.                                     [boolean]
```

```bash
# Start my app using verbose mode, good to use on the first start
cd /to/app
kbox start -- --verbose

# Start another app
kbox app55 start
```

!!! note "First run could take a bit"
    If this is the first time you are starting your Kalabox app it will try to setup all the services and containers you need to run and develop your app.

    This could take a bit of time depending on constitution of the app. For this reason we recommend using the `--verbose` flag your first time starting an app so you can see what is going on.

stop
----

Stop your Kalabox app. You need to have an app context to run this command.


`kbox`

```bash
Options:
  -h, --help     Display help message.                                 [boolean]
  -v, --verbose  Use verbose output.                                   [boolean]
  -d, --debug    Use debug output.                                     [boolean]
```

!!! tip "Good to stop apps you aren't using"
    Kalabox gets great scale and performance using docker containers but its still a good practice to shut down apps that you are not actively using.

version
-------

Prints out the current version of Kalabox you are using. Runs from either an app or global context.

`kbox version`

```bash
Options:
  -h, --help     Display help message.                                 [boolean]
  -v, --verbose  Use verbose output.                                   [boolean]
  -d, --debug    Use debug output.                                     [boolean]
```

Additional Commands
-------------------

Please consult the [configuration](./config.md) page to learn more about adding your own custom commmands. Custom commands allow you to do some of the following things.

  1. Pull down sites from a hosting provider.
  2. Add additional tools to your app like `npm`, `grunt` or `gulp`.

!!! tip "Scope existing app generating plugins for help"
    Check out the [Pantheon](http://github.com/kalabox/kalabox-app-pantheon) and [PHP](http://github.com/kalabox/kalabox-app-php) plugins for some ideas on how to add in your custom workflows.

Using Options
-------------

Kalabox uses the `--` separator for options. The reason for this is we need a way to differentiate between options that might be intended for a subcommand vs options that are for Kalabox itself. Consider the difference between `kbox npm install -v` vs `kbox npm install -- -v`. The former tells `npm` to give us verbose output whereas the latter tells `kbox` to give us verbose output.

### Global options

The following options are available for every command.

```bash
-h, --help     Display help message.                                 [boolean]
-v, --verbose  Use verbose output.                                   [boolean]
-d, --debug    Use debug output.                                     [boolean]
```

### Examples

```bash
# Get help on how to use `kbox create pantheon`
kbox create pantheon -- -h

# Rebuilds a kalabox app with verbose output
kbox rebuild -- --verbose
```
