FROM kalabox/ubuntu

RUN \
  apt-get update && \
  apt-get install -y drush

RUN ln -s /data/config/drush /root/.drush

ENTRYPOINT ["/usr/bin/drush"]