FROM kalabox/debian:master
MAINTAINER Benjamin Cauldwell <benjamin.cauldwell@gmail.com>

RUN apt-get update && \
    apt-get install -y curl && \
    apt-get install -y vim && \
    apt-get install -y supervisor

RUN curl -L "https://github.com/syncthing/syncthing/releases/download/v0.10.21/syncthing-linux-amd64-v0.10.21.tar.gz" -O

RUN tar -zvxf "syncthing-linux-amd64-v0.10.21.tar.gz"

RUN mv syncthing-linux-amd64-v0.10.21/syncthing /usr/local/bin/syncthing

RUN mkdir -p /etc/syncthing/
RUN mkdir -p /sync/
RUN mkdir -p /sync/code/

ADD ./config.xml /etc/syncthing/config.xml
ADD ./syncthing-supervisor.conf /etc/supervisor/conf.d/syncthing-supervisor.conf
ADD ./start.sh /start.sh

EXPOSE 8080 22000 21025/udp 21026/udp

CMD ["/bin/bash", "/start.sh"]
