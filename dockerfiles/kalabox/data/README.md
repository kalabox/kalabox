Kaladata Docker
============

This provides a standard unit of persistant data storage for Kalabox. Other containers should mount this volume with the `--volumes-from` option.

## Standardization

All Kalabox services containers should use the following locations for their code, files and database data:

```
MYSQL (or compatible) data directory = /data/data
git code repo / webroot = /data/code
non-vcs files = /data/files
```

## Building and running

```
$ docker pull pirog/kaladata-docker
$ docker run --name=MY_DATA_VOLUME pirog/kaladata-docker
```

## Mounting on a container

In this example we are using Kalastack-Docker as our services container

```
$ docker run -d -t -e VIRTUAL_HOST=sumptinawesome.kala -e VIRTUAL_PORT=80 -volumes-from MY_DATA_VOLUME -p :22 -p :80 -p :3306 --name="sumptinawesome" pirog/kalastack-docker
```
