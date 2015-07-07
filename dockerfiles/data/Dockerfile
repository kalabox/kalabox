# docker build -t kalabox/data .

FROM busybox

# App code goes here
VOLUME ["/code"]

# media and other things go here
VOLUME ["/media"]

# Revelant certs we might share
VOLUME ["/certs"]

# Services that require data persistence go here
VOLUME ["/sql"]
VOLUME ["/other"]

CMD ["/bin/true"]
