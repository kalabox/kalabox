FROM kalabox/ubuntu

# Install Nginx.
RUN \
  apt-get update && \
  apt-get -y install php5-fpm php5-cli php5-mcrypt php5-mysqlnd php5-xdebug php-apc

# The data container will manage these config files.
RUN rm /etc/php5/fpm/php.ini
RUN ln -s /data/config/php.ini /etc/php5/fpm/php.ini
RUN rm /etc/php5/fpm/pool.d/www.conf
RUN ln -s /data/config/www.conf /etc/php5/fpm/pool.d/www.conf

EXPOSE 9000

CMD ["/usr/sbin/php5-fpm", "-F"]
