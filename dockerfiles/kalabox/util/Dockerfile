# docker build -t kalabox/util .

FROM kalabox/debian:stable

# Install Nginx.
RUN \
  apt-get update && \
  apt-get install -y unzip git wget && apt-get clean
