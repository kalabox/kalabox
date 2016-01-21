Kalabox Cli
===================

Cli image for that contains some basic tools

```

# Cli image for that contains some basic tools
# docker build -t kalabox/cli .
# docker run kalabox/cli

FROM alpine:3.2

RUN \
  apk add --update \
  git \
  rsync \
  openssh \
  wget \
  curl \
  bash && \
  rm -rf /var/cache/apk/*

COPY ./config/gitconfig /root/.gitconfig
COPY ./kgit /usr/bin/kgit

CMD ["true"]

```

