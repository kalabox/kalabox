# docker build -t kalabox/util .

FROM kalabox/debian

# Install Nginx.
RUN \
  apt-get update && \
  apt-get install -y unzip git wget && apt-get clean