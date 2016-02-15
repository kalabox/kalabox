# Cli image for that contains some basic tools
# docker build -t kalabox/cli .
# docker run kalabox/cli

FROM mhart/alpine-node:4

RUN \
  apk add --update \
  git \
  rsync \
  openssh \
  wget \
  curl \
  bash && \
  npm install --production -g grunt-cli gulp-cli bower && \
  rm -rf ~/.npm && \
  npm cache clear && \
  rm -rf /var/cache/apk/*

COPY ./config/gitconfig /root/.gitconfig
COPY ./kgit /usr/bin/kgit

CMD ["true"]
