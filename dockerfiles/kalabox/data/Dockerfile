# BUILD-USING:        $ docker build -t data .
# RUN-USING:          $ docker run -name DATA data
FROM busybox
MAINTAINER Mike Pirog <mike@kalamuna.com>

# Build the data dirs
RUN mkdir -p /data/data
RUN mkdir -p /data/code
RUN mkdir -p /data/files
RUN mkdir -p /data/backups

# Set volume permissions
RUN chmod 755 /data/data
RUN chmod 755 /data/code
RUN chmod 755 /data/files
RUN chmod 755 /data/backups

# This is a weird bug that sets the permissions incorrectly on an empty VOLUME
# https://github.com/dotcloud/docker/issues/2969
RUN touch /data/data/.delete-me
RUN touch /data/code/.delete-me
RUN touch /data/files/.delete-me
RUN touch /data/backups/.delete-me
RUN chmod 666 /data/data/.delete-me
RUN chmod 666 /data/code/.delete-me
RUN chmod 666 /data/files/.delete-me
RUN chmod 666 /data/backups/.delete-me

VOLUME ["/data/data", "/data/code", "/data/files"]

CMD ["/bin/true"]
