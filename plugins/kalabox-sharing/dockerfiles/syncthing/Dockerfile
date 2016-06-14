# Syncthing image for kalabox
# docker build -t kalabox/syncthing .
# docker run -e VERSION v0.11.23 -d kalabox/syncthing

FROM alpine:3.2

ENV VERSION v0.11.26
ENV RELEASE syncthing-linux-amd64-$VERSION

# Add dependencies
RUN \
  apk add --update ca-certificates && \
  wget "https://circle-artifacts.com/gh/andyshinn/alpine-pkg-glibc/6/artifacts/0/home/ubuntu/alpine-pkg-glibc/packages/x86_64/glibc-2.21-r2.apk" && \
  apk add --allow-untrusted glibc-2.21-r2.apk && \
  wget -O /$RELEASE.tar.gz https://github.com/syncthing/syncthing/releases/download/$VERSION/$RELEASE.tar.gz && \
  tar zxf /$RELEASE.tar.gz -C /usr/local && \
  ln -s /usr/local/$RELEASE/syncthing /usr/local/bin && \
  rm /$RELEASE.tar.gz && \
  rm -rf /var/cache/apk/*

ADD ./config.xml /config/config.xml

VOLUME /config
VOLUME /code

EXPOSE 60008 22000 21025/udp 21026/udp

CMD ["-no-browser", "-home=/config"]

ENTRYPOINT ["/usr/local/bin/syncthing"]
