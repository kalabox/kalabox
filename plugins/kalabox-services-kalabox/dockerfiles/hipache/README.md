Kalabox Hipache
===================

Hipache rebased on kalabox/debian

```

# Hipache rebased on kalabox/debian
# docker build -t kalabox/hipache .
# docker run -d -p 80:80 -p 6379:6379 --name kalabox_hipache kalabox/hipache

FROM kalabox/debian:stable

ENV DEBIAN_FRONTEND noninteractive

VOLUME ["/var/lib/redis"]

RUN \
  apt-get update -y && \
  curl -sL https://deb.nodesource.com/setup_0.12 | bash - && \
  apt-get install -y supervisor nodejs npm redis-server && \
  npm install --prefix=/usr/local -g https://github.com/kalabox/hipache/tarball/0.3.1-2 --production && \
  mkdir -p /var/log/hipache && \
  rm -rf /tmp/* && \
  apt-get clean -y && \
  apt-get autoclean -y && \
  apt-get autoremove -y && \
  rm -rf /var/lib/{apt,dpkg,cache,log}/

COPY ./config/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY ./config/redis.conf /src/redis/redis.conf
COPY ./config/hipache.json /src/hipache/config.json

ENV NODE_ENV production

EXPOSE 80
EXPOSE 8160

CMD ["supervisord", "-n"]

```
