Configuration
=============

Kalabox has a sophisticated plugin system that allows users to extend core functionality and provide easy configuration options around many things. Here we will detail some of the configuration options provides by core Kalabox plugins.

Sharing
-------

Kalabox seeks to mitigate the **HARDEST PROBLEM** in VM-based local development: quickly sharing files from your host machine into the VM while maintaining fast page loads. This is a longstanding issue and no project has a perfect solution; for a longer discussion on filesharing, see the [Advanced file sharing topics](#advanced-file-sharing-topics) section below.

With Kalabox, you can easily enable file sharing by adding a `sharing` object to the `pluginconfig` of your app's `kalabox.yml` file:

### Example 1: Directly share your webroot.

This example will create a directory called `code` inside your local app root and it will sync that directory with what is inside your `web` container at `/usr/share/nginx/html`.

```yaml
name: example1
pluginconfig:
  sharing:
    share: 'web:/usr/share/nginx/html'
```

### Example 2: Share a data container mount to a custom code root

This example will create a directory called `wwwdocs` inside your local app root and it will sync that directory with what is inside your `data` container at `/code`.

```yaml
name: example2
pluginconfig:
  sharing:
    codeDir: 'wwwdocs'
    share: 'data:/code'
```

### Advanced file sharing topics

!!! note "No worries on Linux"
    Everything below does not apply if you are using the Linux version of Kalabox because it does not use a VM.

#### Tradeoffs

When it comes to file sharing in Virtual Machine-based local development environments there are essentially two major things to consider:

  1. How fast can my code change get from my host to my VM?
  2. How fast will my app/site load?

**Fast code changes**

Solutions like `vbfs` or `nfs`, which mount files over the network, provide instantaneous changes. They also require the remote machine to "check in" to see if there are any changes to a file before it is read or written. For a site or app with a few files this is no big deal. However, when you have an app using a modern CMS like Drupal with thousands of files, this "checking in" can substantially slow a page load from less than a second to 5, 10, 40 or never seconds, depending on the load.

If you are a sitebuilder who works through the UI instead of directly in code, these solutions can burn a lot of time.

**Fast page loads**

Solutions like `rsync` or `syncthing` will try to keep two directories synced. This lowers the speed that your code change propogates to seconds and can often burn a lot of resources on your machine but it will preserve "native" speed page loads.

If you are someone who is writing and changing code a lot these solutions can burn a lot of time.

#### Enter unison

We've tried to provide the best of both worlds by using native VirtualBox file sharing combined with a [unison](https://www.cis.upenn.edu/~bcpierce/unison/) (yes that is really their website) container.

The sharing process works like this

  1. Your code changes are instantaneously synced to the VM by VirtualBox's `vbfs`
  2. Your local `vbfs` shared local code root and container webroot are mounted into the same `unison` container
  3. We run a `unison` container for each app that scans for and then propogates those changes every second.

!!! attention "We do we scan instead of watch?"
    We cannot use native filesystem events in this model due to [a won't fix bug](https://www.virtualbox.org/ticket/10660) in VirtualBox.

#### The Downside

While this produces `nfs` speed file change propogation along with "native" page loads, the speed of propogation does slow with the amount of files you are scanning. **We are planning to add various config options to sharing so that you can target the paths the make the most sense for file sharing.** For example, on a Drupal site you could share your "sites/all" directory, instead of the entire Drupal codebase.

#### The Roadmap Forward

We **really, really hope** that the above is a stop-gap solution. Docker is currently working on "native" filesharing for both OSX and Windows. Once those are complete and perform better than what we have we will switch our sharing over to use them. You can track the progress of that issue over here:

 * [https://forums.docker.com/t/file-access-in-mounted-volumes-extremely-slow-cpu-bound/8076/108](https://forums.docker.com/t/file-access-in-mounted-volumes-extremely-slow-cpu-bound/8076/108)

Services
--------

Kalabox provides a nice out-of-the-box way to proxy your web-exposed services to nice human readable names such as `http://myapp.kbox`.

You can easily turn on proxying by adding an array of `services` objects to the `pluginconfig` of your app's `kalabox.yml` file.

!!! note "Make sure ports are exposed"
    You need to make sure the relevant containers have exposed the ports you are going to route to by using the `ports` key in your `kalabox-compose.yml` file. If you do not do this the routes will fail.

### Example 1: Expose a simple HTTP server

This config will start the following maps:

  * `http://example1.kbox` => port `80` on your `web` container.

```yaml
name: example1
pluginconfig:
  services:
    web:
      - port: 80/tcp
        default: true
```

### Example 2: Expose a simple web container and a HTTPS termination/varnish container.

This config will start the following maps:

  * `http://example2.kbox`        => port `8888` on your `web` container.
  * `https://example2.kbox`       => port `444` on your `web` container.
  * `http://edge.example2.kbox`   => port `80` on your `edge` container.
  * `https://edge.example2.kbox`  => port `443` on your `edge` container.

```yaml
name: example2
pluginconfig:
  services:
    web:
      - port: 8888/tcp
        default: true
      - port: 444/tcp
        default: true
        secure: true
    edge:
      - port: 80/tcp
        hostname: edge
      - port: 443/tcp
        hostname: edge
        secure: true
```

Tooling
-------

You can easily add additional development tools to any Kalabox app using our baked in `kalabox-cmd` plugin. This allows users to couple development tools like `grunt`, `bower` and `drush` to a given app, standardizing the tools your team uses on a project-to-project basis and eliminating the chaos of installing on your local machine.

Tooling works by installing and associating additional Docker containers to your app. These containers should contain the development commands you wish to run and should be set up to mount relevant local assets like `ssh keys`, config or code. While well constructed tooling containers should feel like "natively" running the same commands there are a few things that can be different. Here are some general guidelines to help you construct good tooling containers:

  1. Mount your webroot into the tooling container so you have access to your code.
  2. Use a custom entrypoint script to correctly map local to container permissions.
  3. Mount your binaries as volumes so they can be shared with containers.
  4. Set the container's working directory so that it matches the users local location.
  5. Set any config in relevant environmental variables if possible

!!! danger "Experimental feature"
    There may be instances where it's still easier to use tools on your native host machine. For example you may be more comfortable using Tower or your native git for ease-of-use or speed instead of `kbox git`. Do what's best for you! Especially while we continue to work out the kinks with tooling.

You can turn on the cli plugin in your app pretty easily by adding the following into your app's `kalabox.yml` plugin config

```yaml
pluginconfig:
  cli: 'on'
```

Once you turn this on and restart your app Kalabox will look for two additional configuration files inside your app's root directory

  * `kalabox-cli.yml`
  * `cli.yml`

The former is another `docker-compose` file that contains additional "tooling" containers and the latter contains metadata about how to map new `kbox commands`to those tooling containers.

### Example 1: Add `kbox git` to an app

#### kalabox-cli.yml

```yaml
cli:

  # We want to pull down a container that contains git
  image: kalabox/cli:dev

  # This shares your home directory into the container at /user so that the containerized git can share your local SSH key
  volumes:
    - $KALABOX_ENGINE_HOME:/user

  # We want to mount our web container's volumes onto this one so that we can get access to the application's git repo
  volumes_from:
    - web

  # We want to set some custom configuration so our git runs the way we want it to and with the right config
  environment:
    WEBROOT: /usr/share/nginx/html
    TERM: xterm-color
    GIT_SSH_COMMAND: ssh -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no -o IdentityFile=/user/.ssh/id_rsa
    GIT_AUTHOR_NAME: Jean Luc Picard
    GIT_AUTHOR_EMAIL: captain@enterprise-e.mil
    GIT_COMMITTER_NAME: Jean Luc Picard
    GIT_COMMITTER_EMAIL: captain@enterprise-e.mil

  # This should always be the directory that contains your webroot
  working_dir: /usr/share/nginx/html

  # You will want this on so you can handle interactive commands
  stdin_open: true
  tty: true
```

#### cli.yml

```yaml
git:
  service: cli
  description: Run a git command on your codebase
```

#### Usage

If you run `kbox` inside of your app you should now be able to see `kbox git` listed as a command. This command works as though `git` were installed locally.

```bash
# Check the status of my git repo
kbox git status

# Stage all changes
kbox git add --all

# Commit all changes
kbox git commit -m "My amazing commit"

# Push master branch changes to some remote called origin
kbox git push origin master
```

### Example 2: Add Drupal power tools to your app

#### kalabox-cli.yml

```yaml
drush:

  # Grab a premade image with php, composer and drush installed
  image: drush/drush:8-php5

  # Share some directories
  volumes:
    - $KALABOX_ENGINE_HOME:/user
    - $KALABOX_APP_ROOT:/src
    - $KALABOX_APP_ROOT/config/scripts/usermap.sh:/usr/local/bin/usermap
    - $KALABOX_APP_ROOT/config/drush:/home/$KALABOX_ENGINE_ID/.drush

  # Mount our application code from a data container
  volumes_from:
    - data

  # Pass in environmental variables to tell our container how to handle permissions and databases
  environment:
    HOME: /home/$KALABOX_ENGINE_ID
    MYSQL_HOST: database
    TERM: xterm-color
    HOSTNAME: $KALABOX_APP_HOSTNAME
    KALABOX_UID: $KALABOX_ENGINE_ID
    KALABOX_GID: $KALABOX_ENGINE_GID

  # Link to our database container so drush can work
  links:
    - db:database

  # Map the users local CWD to the correct location inside the container
  working_dir: $KALABOX_CLI_WORKING_DIR

  # You will want this on so you can handle interactive commands
  stdin_open: true
  tty: true
```

#### cli.yml

```yaml
mysql:
  service: drush
  precmdopts: -uroot
  entrypoint: mysql
  description: Drop into a mysql shell
  mapping: <config.sharing.codeDir>:/var/www/html
drush:
  service: drush
  entrypoint: usermap
  description: Run a drush command on your codebase
  mapping: <config.sharing.codeDir>:/var/www/html
php:
  service: drush
  entrypoint: usermap
  description: Run a php cli command
  mapping: <config.sharing.codeDir>:/var/www/html
composer:
  service: drush
  entrypoint: usermap
  description: Run a composer cli command
  mapping: <config.sharing.codeDir>:/var/www/html
```

!!! tip "Notice the `precmdopts` used in `kbox mysql`"
    This will automatically prepend options before the user entered part of the command, in this case connecting you to mysql before anything else happens.

    `postcmdopts` can also be used in the same way, for example to always run a command in verbose mode using `-v`.

#### Usage

You should now be able to run `kbox` and see the following commands listed...

  * `kbox mysql`
  * `kbox drush`
  * `kbox php`
  * `kbox composer`

These commands should all work like they normally do with the exception of `mysql` which will drop you directly to the `mysql` prompt.

```bash
# Drop into a myqsl shell connected to my app's database container
kbox mysql

# Run an arbitrary piece of php
kbox php -e "phpinfo();"

# Flush my drupal caches
kbox drush cc all

# Check the composer version
kbox composer --version
```
