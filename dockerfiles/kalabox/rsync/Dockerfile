# docker build -t kalabox/rsync .
# docker run -d --name rsync -p 873:873 -v /mnt:/mnt kalabox/rsync
FROM kalabox/ubuntu

RUN apt-get update && \
  DEBIAN_FRONTEND=noninteractive apt-get install -yq \
    rsync

EXPOSE 873
ADD ./run /usr/local/bin/run

ENTRYPOINT ["/usr/local/bin/run"]