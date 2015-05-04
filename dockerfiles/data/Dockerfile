# docker build -t kalabox/data .
FROM busybox

# App code goes here
VOLUME ["/code"]

# Services that require data persistence go here
VOLUME ["/sql"]
VOLUME ["/other"]

CMD ["/bin/true"]
