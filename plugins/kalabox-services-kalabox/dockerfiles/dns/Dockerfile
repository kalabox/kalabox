# Dnsmasq image for wildcard support *.kbox
# docker build -t kalabox/dns .
# docker run -d -e IP=1.3.3.7 -e DOMAIN=kbox -p 1.3.3.7:53:53/udp kalabox/dns

FROM alpine:3.2

RUN \
  apk add --update dnsmasq && \
  rm -rf /var/cache/apk/*

ADD start.sh /start.sh
ADD dnsmasq.conf /etc/dnsmasq.conf

EXPOSE 53
CMD ["/start.sh"]
