# docker build -t kalabox/drush .

FROM kalabox/ubuntu

RUN \
  apt-get update && \
  apt-get install -y drush mysql-client php5-cli php5-dev php5-gd php5-mcrypt php5-mysqlnd

RUN ln -s /data/config/drush /root/.drush

ENTRYPOINT ["/usr/bin/drush"]