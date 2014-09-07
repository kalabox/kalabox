## Kalabox App Manager Concept

Once an application is created based on a profile and various components,
the config data is copied to somewhere like `~/kalabox/apps/myd8site`.

`myd8site` is the app name, and inside is the application `config.json` and a `cids` directory.

The `cids` directory contains plain text files named by component key, with the container id
as its contents. This provides a way for the app to know if a container exists, and easily
access the container by component.

Components with the key `data` are treated special in that they will be created first. This
is so volumes from the data container can be shared with all other containers launched after it.

Containers names are prefixed with the app name, and then appended with the component key.

For example: `<app name>_<component key>' would translate to something like: `myd8site_web`.

## AppManager

`AppManager` can be instantiated with the path to the application config. It assumes the app
name is the last section of the path.

This means an instance of AppManager only controls a single application.

See `appmanager.js` for its functions.

## Gulp Demo

This demo is setup for a ubuntu system running docker locally through the unix socket. Theoretically
you could change the remote path for `dockerode` and it should still work.

Gulp at this point is only used for demonstrating the use of `AppManager`.

You can see the path to the config, `myd8site` is hard coded in `gulpfile.js`.

If gulp were actually going to be used, we would need to parse arguments so the app name
could be passed in.


```
# pull all defined images (be patient)
gulp pull-images

# create containers
gulp init

# start containers
gulp start

# stop containers
gulp stop

# restart containers
gulp restart

# kill containers
gulp kill

# remove containers
gulp remove
```

