# docker build -t kalabox/data-php

FROM busybox

COPY data /data
RUN chmod 777 /data/files
RUN chmod a+x /data/scripts/*

VOLUME ["/data"]

CMD ["/bin/true"]
