Kalabox SkyDock
===================

A small little container that acts as the SkyDock executable

```

# A small little container that acts as the SkyDock executable
# docker build -t kalabox/skydock .
# docker run -d --volumes-from kalabox_data -v /var/run/docker.sock:/docker.sock -v /skydock.js:/skydock.js --name kalabox_skydock kalabox/skydock
# may still need to append:
# -ttl 2147483647 -environment dev -s /docker.sock -domain kbox -name kalabox_skydns -beat 5 -plugins /data/config/skydock.js

FROM kalabox/debian:stable

COPY ./config/skydock.js /data/config/skydock.js

RUN \
  curl -L https://github.com/kalabox/skydock/releases/download/v0.2.0/skydock > /skydock && \
  chmod 777 /skydock && \
  chmod 777 /data/config/skydock.js

ENTRYPOINT ["/skydock", "-ttl", "2147483647", "-environment", "dev", "-beat", "5"]


```

