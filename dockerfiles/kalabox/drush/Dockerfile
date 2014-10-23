# docker build -t kalabox/drush .

FROM kalabox/debian

RUN \
  apt-get install -y drush mysql-client php5-cli php5-dev php5-gd php5-mcrypt php5-mysqlnd && apt-get clean

RUN ln -s /data/config/drush /root/.drush

ENTRYPOINT ["/usr/bin/drush"]
