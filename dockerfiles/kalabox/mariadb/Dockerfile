# docker build -t kalabox/mariadb .

FROM kalabox/debian

# Install MariaDB.
RUN \
  apt-get update -y && \
  DEBIAN_FRONTEND=noninteractive apt-get install -y python-software-properties && \
  apt-key adv --recv-keys --keyserver keyserver.ubuntu.com --recv 0xcbcb082a1bb943db && \
  add-apt-repository 'deb http://sfo1.mirrors.digitalocean.com/mariadb/repo/10.0/debian wheezy main' && \
  apt-get update -y && \
  DEBIAN_FRONTEND=noninteractive apt-get install -y mariadb-server && apt-get clean \
  rm -rf /var/lib/apt/lists/* && \
  sed -i 's/^\(bind-address\s.*\)/# \1/' /etc/mysql/my.cnf && \
  echo "mysqld_safe &" > /tmp/config && \
  echo "mysqladmin --silent --wait=30 ping || exit 1" >> /tmp/config && \
  echo "mysql -e 'GRANT ALL PRIVILEGES ON *.* TO \"root\"@\"%\";'" >> /tmp/config && \
  bash /tmp/config && \
  rm -f /tmp/config

# The data container will manage these config files.
RUN rm /etc/mysql/my.cnf
RUN ln -s /src/.kalabox/config/mysql/my.cnf /etc/mysql/my.cnf

# Can't write data to /data/data because this
# needs to be run on the mounted volume.
VOLUME ["/var/lib/mysql"]

User root

# Define working directory.
WORKDIR /var/lib/mysql

# Define default command.
CMD ["mysqld_safe"]

# Expose ports.
EXPOSE 3306