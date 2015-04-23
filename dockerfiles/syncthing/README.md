Kalabox Syncthing
===================

A small little container that acts as a syncthing node

```

FROM kalabox/debian:stable

RUN apt-get update && \
    apt-get install -y supervisor && \
    curl -L "https://github.com/syncthing/syncthing/releases/download/v0.10.21/syncthing-linux-amd64-v0.10.21.tar.gz" -O && \
    tar -zvxf "syncthing-linux-amd64-v0.10.21.tar.gz" && \
    mv syncthing-linux-amd64-v0.10.21/syncthing /usr/local/bin/syncthing && \
    mkdir -p /etc/syncthing/ && \
    mkdir -p /sync/ && \
    mkdir -p /sync/code/

ADD ./config.xml /etc/syncthing/config.xml
ADD ./syncthing-supervisor.conf /etc/supervisor/conf.d/syncthing-supervisor.conf
ADD ./start.sh /start.sh

EXPOSE 60008 22000 21025/udp 21026/udp

CMD ["/bin/bash", "/start.sh"]


```
