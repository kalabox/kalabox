Troubleshooting
===============

Accessing Logs
--------------

Kalabox has a few different log layers to help you diagnose any issues you might be having.

### Install Logs

If you have a failed installation, you should be able to find logs in the following locations...

* **Windows** - `%TEMP%\Setup Log**.txt`
* **macOS** - `/var/log/install.log`
* **Linux** - Differs per system but check common `apt` or `dnf/yum` logs

### Runtime Logs

If you encounter an error during runtime, check out the runtime log at...

  * **macOS/LINUX** - `~/.kalabox/logs/kalabox.log`
  * **Windows** - `C:\Users\{ME}\.kalabox\logs\kalabox.log`

!!! tip "Pro Tip: Use verbose or debug mode!""
    Run the failing command again with either the `-v` or `-d` option to get more useful debug output. But be careful because this output could contain sensitive information.

### Docker Logs

One of the best ways to troubleshoot an issue is to get access to the Kalabox Engine and start hacking around.

!!! attention "Make sure you are ready to run Docker commands on the engine"
    Follow the instructions for [macOS/Windows](./general/engine/#engine-for-osxwin) or [Linux](./general/engine/#engine-for-linux)

**Some basic Docker commands**

Once you've completed the above you should be able to communicate with your containers. Here are a few helpful commands but please consult the official [Docker documentation](https://docs.docker.com/engine/) for a full spec of commands.

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

### Container Logs

While you can get container logs by following some of the steps above you can also access specific container logs by mounting them back out onto your host machine. This is done by modifiying your `kalabox-compose.yml` file, which is a normal [Docker Compose](https://docs.docker.com/compose/compose-file/) with a bunch of extra [environmental variables](users/cli/#env) that Kalabox sets for you.

### Example: Sharing your entire logs directory

Here is a basic example of a `kalabox-compose.yml` `php` service that shares the entire `/var/log` directory of your container to `logs` inside of your app's root directory.

```yml
php:
  image: php-7.0
  hostname: $KALABOX_APP_HOSTNAME
  volumes:
    - $KALABOX_APP_ROOT_BIND/logs:/var/log
```

Common Installation Issues
--------------------------

### Resolving Duplicate Host Only Adapters

Any time you install a project that relies on VirtualBox (Docker Toolbox or a Vagrant-based project like Drupal VM are good examples), one of these host-only network adapters is created, and sometimes when you've frequently installed/uninstalled the same projects multiple times, these duplicates occur. Note that *ANY* duplicates (even if they aren't from Kalabox) can cause this issue.

Fortunately, removing these duplicates is fairly easy:

1. Open VirtualBox.

2. Look at each of your virtual machines and record the value for their "Host-only Adapter" under the "Network" section:

    ![Kalabox2 in VirtualBox](./images/kalabox2vb.png)
<br>
3. Now go to Preferences -> Network -> Host-only Network to see a list of all your adapters:

    ![List of host only adapter in VirtualBox](./images/hostonlyadapters.png)
<br>
4. Delete any of the adapters that aren't being used by one of your virtual machines.

### Installation hangs in last minute

Sometimes `docker` certs and config from an older version of docker can intefere with installation of Kalabox. To work around these issues you can try:

1. Uninstalling Kalabox
2. Removing `~/.docker` folders
3. Reinstalling Kalabox

!!! Note "Be careful removing `~/.docker`"
    You might want to make sure that you do not have other docker based products that require some of the config in `~/.docker`.

### Behind a network PROXY or FIREWALL

If your service activation fail on Windows or you get an error like "Error while pulling image: Get https://index.docker.io/v1/repositories/kalabox/proxy/images: x509: certificate signed by unknown authority" in your macOS/Linux installer log then you might be behind a network proxy or firewall that is preventing you from pulling the needed Kalabox dependencies.

Check out [https://github.com/kalabox/kalabox/issues/1635](https://github.com/kalabox/kalabox/issues/1635) for more details on that issue.

### Windows is also running Hyper-V

In some cases you cannot use VirtualBox (a critical Kalabox dependency) with Hyper-V however there is a documentated workaround you can check out over at [https://derekgusoff.wordpress.com/2012/09/05/run-hyper-v-and-virtualbox-on-the-same-machine/](https://derekgusoff.wordpress.com/2012/09/05/run-hyper-v-and-virtualbox-on-the-same-machine/)

The author says, "VirtualBox and Hyper-V cannot co-exist on the same machine. Only one hypervisor can run at a time, and since Hyper-V runs all the time, while VirtualBox only runs when it is launched, VirtualBox is the loser in this scenario."

Kalabox should install on your machine after using the above workaround.

!!! Note "Eventually we will use Hyper-V"
    As soon as `Docker for Windows` is mature and has performant file sharing we plan to switch our backend over to that, which uses Hyper-V instead of VirtualBox.

### Windows install pops up with an error

It's somewhat difficult to parse out useful installation errors on Windows. Here is a brief guide to help do that.


  **1. Verify that you do not have another documentated install problem (see above)**

  **2. Verify that you have [VT-x enabled](http://docs.kalabox.io/en/stable/general/sysreq/#system-requirements)**

  **3. Run through the installer and continue installing after it fails**

  Run the installer through to the end. Don't choose to rollback if given that option. You can uninstall the borked install later.

  **4. Try to manually run the appropriate script**

  You should now have a bunch of `*.bat` files somewhere in `"C:\Program Files\Kalabox\engine.bat"` Verify that is true and note that you may have a different sysDrive like D:\. It is also possible that the `*.bat` files are in a subdirectory.

  Anyway, please copy the path location of the correct file according to the mapping below

```bash
Got "Engine activation failed" -> engine.bat
Got "Service activation failed" -> services.bat
Got "DNS activation failed" -> dns.bat
```

  Open cmd.exe and try to run the script.

!!! Note "Be careful to use correct permissions"
    For `engine.bat` and `services.bat` you need to make sure you **DO NOT RUN AS AN ADMINISTRATOR**. For `dns.bat` you need to make you **DO RUN AS AN ADMINSTRATOR**. By "run as administrator" we mean run with "elevated privileges".

  *Example*

```batch
"C:\Program Files\Kalabox\engine.bat"
```

  At some point this should fail and give some better details about the underlying issue.
