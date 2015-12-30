# Dnsmasq image for wildcard support *.kbox
# docker build -t kalabox/dns .
# docker run -d -e IP=1.3.3.7 -e DOMAIN=kbox -p 1.3.3.7:53:53/udp --name kalabox_dns kalabox/dns

FROM kalabox/debian:stable

COPY start.sh /root/start.sh

RUN \
  apt-get update -y && \
  apt-get install -y dnsmasq && \
  echo 'user=root' >> /etc/dnsmasq.conf && \
  echo 'address=/DOMAIN/IP' >> /etc/dnsmasq.conf && \
  chmod 777 /root/start.sh && \
  apt-get clean -y && \
  apt-get autoclean -y && \
  apt-get autoremove -y && \
  rm -rf /var/lib/{apt,dpkg,cache,log}/

EXPOSE 53

CMD ["/root/start.sh"]
