FROM kalabox/debian:stable

RUN apt-get update && \
    apt-get install -y supervisor && \
    cd /tmp && \
    curl -L "https://github.com/syncthing/syncthing/releases/download/v0.11.25/syncthing-linux-amd64-v0.11.25.tar.gz" -O && \
    tar -zvxf "syncthing-linux-amd64-v0.11.25.tar.gz" && \
    mv syncthing-linux-amd64-v0.11.22/syncthing /usr/local/bin/syncthing && \
    mkdir -p /etc/syncthing/ && \
    mkdir -p /sync/ && \
    mkdir -p /sync/code/ && \
    apt-get -y clean && \
    apt-get -y autoclean && \
    apt-get -y autoremove && \
    rm -rf /var/lib/apt/* && rm -rf && rm -rf /var/lib/cache/* && rm -rf /var/lib/log/* && rm -rf /tmp/*

ADD ./config.xml /etc/syncthing/config.xml
ADD ./syncthing-supervisor.conf /etc/supervisor/conf.d/syncthing-supervisor.conf
ADD ./start.sh /start.sh

EXPOSE 60008 22000 21025/udp 21026/udp

CMD ["/bin/bash", "/start.sh"]

