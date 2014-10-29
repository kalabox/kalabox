# docker build -t kalabox/drush .

FROM kalabox/debian

# Install Drush & dependencies
RUN \
  apt-get install -y mysql-client php5-cli php5-dev php5-gd php5-mcrypt php5-mysqlnd curl git sqlite && apt-get clean

# Install Composer
RUN \
 curl -sS https://getcomposer.org/installer | php && \
 mv composer.phar /usr/local/bin/composer && \
 ln -s /usr/local/bin/composer /usr/bin/composer


# Install Drush
RUN \
  git clone https://github.com/drush-ops/drush.git /usr/local/src/drush && \
  cd /usr/local/src/drush && \
  git checkout 7.0.0-alpha5 && \
  ln -s /usr/local/src/drush/drush /usr/bin/drush && \
  composer install


# Install Switchboard
# RUN \
#  git clone https://github.com/fluxsauce/switchboard.git /switchboard && \
#  cd /switchboard && \
#  composer update --no-dev && \
#  vendor/propel/propel1/generator/bin/propel-gen && \
#  vendor/propel/propel1/generator/bin/propel-gen insert-sql && \
#  drush cc drush

RUN ln -s /src/.kalabox/config/drush /root/.drush
# RUN ln -s /switchboard /root/.drush/switchboard

ENTRYPOINT ["/usr/bin/drush"]