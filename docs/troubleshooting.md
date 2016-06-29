Kalabox Logs
============

### Install logs

If you have a failed installation you should be able to find logs in the following
locations

* **Windows** - `%TEMP%\Setup Log**.txt
* **MacOSX** - `/var/log/install.log`
* **Linux** - Differs per system but check common `apt` or `dnf/yum` logs

### Runtime Logs

If you encounter an error during runtime there are a few things you can do to get more
information.


2. Check out the runtime log at
  * **OSX/LINUX** - `~/.kalabox/logs/kalabox.log`
  * **Windows** - `C:\Users\{ME}\.kalabox\logs\kalabox.log`

!!! tip "Pro Tip: Use verbose mode!""
    Run the failing command again with the `-- -v` option to get more useful
    debug output.

Accessing the Kalabox engine
============================

One of the best ways to troubleshoot an issue is to get access to the Kalabox Docker daemon and start hacking around. Here is the easiest way to do that on each OS.

!!! warn "Make sure the Kalabox Engine is on!""
    Make sure you've [activated]() the Kalabox engine before attempting the
    below.

### OSX

```bash
# You might want to consider adding this to your PATH variable
export DOCKER_MACHINE=/Applications/Kalabox.app/Contents/MacOS/bin/docker-machine

# This will drop you into the Kalabox2 VM
$DOCKER_MACHINE ssh Kalabox2
```

### Windows

!!! note "Install Directory"
    This assumes you have installed Kalabox at `C:\Program Files\Kalabox`. Replace
    that directory below if your location is different.

```bash
# You might want to consider adding this to your PATH variable
set DOCKER_MACHINE="C:\Program Files\Kalabox\bin\docker-machine-exe"

# This will drop you into the Kalabox2 VM
%DOCKER_MACHINE% ssh Kalabox2
```

### Linux

```
# Set your DOCKER_HOST to point to Kalabox
export DOCKER_HOST=tcp://10.13.37.100:2375

# Might want to consider adding this to your path
export DOCKER=/usr/share/kalabox/bin/docker
$DOCKER info
```

### Some basic Docker commands

Once you've completed the above you should be able to communicate with your
containers. Here are a few helpful commands but please consult the official
[Docker documentation](https://docs.docker.com/engine/) for a full spec of commands.

**List all my containers**
`docker ps --all`

**List all core kalabox containers**
`docker ps --all | grep kalabox_`

**List all containers for a particular app**
`docker ps --all | grep myappname`

**Inspect a container**
`docker inspect service_myappname_1`

**Check out the logs for a container**
`docker logs service_appname_1`

**Attach to a container (this is like SSHing)**
`docker exec -i -t service_appname_1 bash`

Resolving Duplicate Host Only Adapters
======================================

Any time you install a project that relies on VirtualBox (Docker Toolbox or a Vagrant-based project like Drupal VM are good examples), one of these host-only network adapters is created, and sometimes when you've frequently installed/uninstalled the same projects multiple times, these duplicates occur. Note that *ANY* duplicates (even if they aren't from Kalabox) can cause this issue.

Fortunately, removing these duplicates is fairly easy:

1. Open VirtualBox.
2. Look at each of your virtual machines and record the value for their "Host-only Adapter" under the "Network" section:

![Kalabox2 in VirtualBox](./images/kalabox2vb.png)

3. Now go to Preferences -> Network -> Host-only Network to see a list of all your adapters:

![List of host only adapter in VirtualBox](./images/hostonlyadapters.png)

4. Delete any of the adapters that aren't being used by one of your virtual machines.
