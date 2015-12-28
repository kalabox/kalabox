# Lightweight SKYDNS executable container for kalabox2
# docker build -t kalabox/skydns .
# docker run -d -p 172.17.42.1:53:53/udp --name kalabox_skydns kalabox/skydns
# may still need to append: -nameserver 8.8.8.8:53 -domain kbox to run

FROM kalabox/debian:stable

RUN \
  curl -L https://github.com/kalabox/skydns1/releases/download/v0.2.0/skydns > /skydns && \
  chmod 777 /skydns

VOLUME ["/data"]

EXPOSE 8080
EXPOSE 53/udp

ENTRYPOINT ["/skydns", "-http", "0.0.0.0:8080", "-dns", "0.0.0.0:53"]
