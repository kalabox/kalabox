# docker build -t kalabox/data .
FROM busybox

# This exists just for legacy
# Will deprecate soon
VOLUME ["/data"]

# App code goes here
VOLUME ["/code"]

# Revelant certs we might share
VOLUME ["/certs"]

# Services that require data persistence go here
VOLUME ["/sql"]
VOLUME ["/other"]

CMD ["/bin/true"]
