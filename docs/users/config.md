Configuration
=============

Sharing
-------

Kalabox seeks to mitigate the **HARDEST PROBLEM** in VM-based local development: quickly sharing files from your host machine into the VM while maintaining fast page loads. This is a longstanding issue and no project has a perfect solution; for a longer discussion on filesharing, see the [Tradeoffs](/#tradeoffs) section below.

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

Solutions like `rsync` or `syncthing` will try to keep two directories synced. This lowers the speed of your code changes to seconds and can often burn a lot of resources on your machine but it will preserve "native" speed page loads.

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
=======

You can easily add additional tooling commands to any Kalabox app using our backed in `kalabox-cmd` plugin. You can turn on the cli plugin in your app pretty easily by adding the following into your app's `kalabox.yml` plugin config

```yaml
pluginconfig:
  cli: 'on'
```

Once you turn this on and restart your app Kalabox will look for two additional configuration files inside your app root directory

  * `kalabox-cli.yml`
  * `cli.yml`

The former is another `docker-compose` file that contains additional "tooling" containers you want to use and the latter contains metadata about how to set up specific "commands" you can run. Here is an example that adds a "git" command to your app.

**kalabox-cli.yml**

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

**cli.yml**

This is a special Kalabox file that helps you map `kbox cmd` to a specific services. It provides a few additional options as
well.

Here is a abstract description of a task object

```yaml
commandname:
  service: [service] - The service on which to run the command.
 stripfirst: [true|false] - If your commandname key is different from the
entrypoint you might want to strip the commandname aka running `kgit git`
     vs `kgit`.

entrypoint: [string|array] - The binary to use. This will default to the
   entrypoint of the service.

description: [string] - A human readable description that will show up
     on the CLI.

precmdopts: [string] - A string of options to insert between the entrypoint
     and the command the user types.

postcmdopts: [string] - A string to append to the user entered command.


 NOTE: You will want to make sure your services correctly set relevant options
 such as sharing config files or the working directory.



 Adds a git command to your app.


git:
  service: cli
  description: Run a git command on your codebase
```
Now run kbox inside your app and you should see kbox git as an available command.

