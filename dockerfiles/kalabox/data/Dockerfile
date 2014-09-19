# docker build -t kalabox/data .

FROM busybox

COPY data /data
RUN chmod 777 /data/files

VOLUME ["/data"]

CMD ["/bin/true"]
