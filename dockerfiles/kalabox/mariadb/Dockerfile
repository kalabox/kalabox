# docker build -t kalabox/mariadb .

FROM kalabox/debian:stable

# Install MariaDB.
RUN \
  apt-get update -y && \
  DEBIAN_FRONTEND=noninteractive apt-get install -y python-software-properties && \
  apt-key adv --recv-keys --keyserver keyserver.ubuntu.com --recv 0xcbcb082a1bb943db && \
  add-apt-repository 'deb http://sfo1.mirrors.digitalocean.com/mariadb/repo/10.0/debian wheezy main' && \
  apt-get update -y && \
  DEBIAN_FRONTEND=noninteractive apt-get install -y mariadb-server && apt-get clean

# The data container will manage these config files.
# @todo: we can't do this on Windows yet because VBOX sharing sets all
# files to 777 and mysql wont load a world writable conf file
#RUN rm /etc/mysql/my.cnf
#RUN ln -s /src/config/mysql/my.cnf /etc/mysql/my.cnf
# Windows sometimes causes this to become world-writable
#RUN chmod 644 /src/config/mysql/my.cnf

RUN rm /etc/mysql/my.cnf
COPY my.cnf /etc/mysql/my.cnf

User root

# Define default command.
CMD ["mysqld_safe"]

# Expose ports.
EXPOSE 3306
