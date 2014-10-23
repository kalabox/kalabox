# docker build -t kalabox/python .

FROM kalabox/debian

# Install Python.
RUN \
  apt-get install -y python python-dev python-pip python-virtualenv && \
  rm -rf /var/lib/apt/lists/*

# Define working directory.
WORKDIR /data

# Define default command.
CMD ["bash"]
