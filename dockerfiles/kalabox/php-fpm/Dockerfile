# docker build -t kalabox/php-fpm

FROM kalabox/ubuntu

# Install PHP.
RUN \
  apt-get update && \
  apt-get -y install php5-fpm php5-cli php5-gd php5-mcrypt php5-mysqlnd php5-xdebug php-apc

# The data container will manage these config files.
RUN rm /etc/php5/fpm/php.ini
RUN ln -s /data/config/php/php.ini /etc/php5/fpm/php.ini
RUN rm /etc/php5/fpm/pool.d/www.conf
RUN ln -s /data/config/php/www.conf /etc/php5/fpm/pool.d/www.conf

EXPOSE 9000

CMD ["/usr/sbin/php5-fpm", "-F"]
