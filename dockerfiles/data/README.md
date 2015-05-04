Kalabox Data
===================

Data container also containing some plugins for skydock

```

# docker build -t kalabox/data .
FROM busybox

# Soon to be deprecated
VOLUME ["/data"]

# App code goes here
VOLUME ["/code"]

# Services that require data persistence go here
VOLUME ["/sql"]
RUN chmod 755 /sql

CMD ["/bin/true"]


```
