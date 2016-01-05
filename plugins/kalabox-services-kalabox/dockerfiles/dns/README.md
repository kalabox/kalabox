Kalabox DNS
===================

Dnsmasq for DHCP and DNS things!

```

# Dnsmasq image for wildcard support *.kbox
# docker build -t kalabox/dns .
# docker run -d -e IP=1.3.3.7 -e DOMAIN=kbox -p 1.3.3.7:53:53/udp kalabox/dns

FROM alpine:3.2

RUN \
  apk add --update dnsmasq && \
  echo 'user=root' >> /etc/dnsmasq.conf && \
  echo 'address=/DOMAIN/IP' >> /etc/dnsmasq.conf && \
  rm -rf /var/cache/apk/*

ADD start.sh /start.sh

EXPOSE 53
CMD ["/start.sh"]

```

