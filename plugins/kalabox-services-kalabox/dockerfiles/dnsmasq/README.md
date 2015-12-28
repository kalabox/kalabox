Kalabox DNSMASQ
===================

Dnsmasq for DHCP and DNS things!

```

# Dnsmasq image for wildcard support *.kbox
# docker build -t kalabox/dnsmasq .
# docker run -d -e KALABOX_IP=1.3.3.7 -p 1.3.3.7:53:53/udp --name kalabox_dnsmasq kalabox/dnsmasq

FROM kalabox/debian:stable

COPY start.sh /root/start.sh

RUN \
  apt-get update -y && \
  apt-get install -y dnsmasq && \
  echo 'user=root' >> /etc/dnsmasq.conf && \
  echo 'address=/KALABOX_DOMAIN/KALABOX_IP' >> /etc/dnsmasq.conf && \
  chmod 777 /root/start.sh && \
  apt-get clean -y && \
  apt-get autoclean -y && \
  apt-get autoremove -y && \
  rm -rf /var/lib/{apt,dpkg,cache,log}/

EXPOSE 53

CMD ["/root/start.sh"]


```

