# Kalabox

This project is currently under heavy development. The
documentation here is currently directed towards developers
working on the project.


## Developer Install
```
git clone https://github.com/kalabox/kalabox.git
cd kalabox
npm install

# link kbox executable
ln -s bin/kbox.js /usr/local/bin/kbox

# OSX
# Install Boot2Docker First
bin/setup_osx

# Ubuntu
# Install Docker First
bin/setup_linux
```

**Note:** DNS resolvers for '*.kbox` may need to be setup manually for now.

For OSX create a file at `/etc/resolver/kbox` and add the following line:
```
nameserver 1.3.3.7
```

Kalabox runs a nameserver on the Docker Host, and the goal here is to
add this as a nameserver to your system. As of right now, it's a little
spotty to do this programmatically.


## Run the D7 Example App profile
```
# Change directories
cd app_examples/d7-app

# Build all dependencies
kbox build

# Pull all dependencies (There aren't any in this example)
kbox pull

# Now that the images for this profile exist, we can initialize the app.
# Initializing creates app containers, but they are not started yet.
kbox init

# Start the containers
kbox start
```

If DNS is resolving correctly and all the containers were built and started,
you will be able to access your app in a browser at: http://d7-app.kbox

By default, there is only an index printing the output of `phpinfo();`.

You can run a couple commands provided by the d7 and drush plugins.

```
# Download Drupal 7 to the public directory
kbox d7.dl

# Install the site with a user/pass of admin/kalabox
kbox d7.install

# Run a drush command after kbox
kbox drush status
```


## Other useful commands
```
# List apps & the status of apps kalabox knows about
kbox list

# You can check at the Docker level if the containers are running.
docker ps

# Alternatively, you can check all containers, whether they are running or not.
docker ps -a

# stop containers
kbox stop

# remove containers (uninstall the app)
kbox remove

# re-install the app
kbox init

# purge non kalabox containers. i.e. remove all containers that do not start with kb_ or kala
kbox pc

```
