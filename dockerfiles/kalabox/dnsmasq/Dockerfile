# Dnsmasq image for wildcard support *.kbox
# docker build -t kalabox/dnsmasq .
# docker run -d --name dns -p 1.3.3.7:53:53 kalabox/dnsmasq

FROM ubuntu:14.04

RUN apt-get update && apt-get install -y dnsmasq dnsutils && apt-get clean

RUN echo 'user=root' >> /etc/dnsmasq.conf
RUN echo 'address=/.kbox/1.3.3.7' >> /etc/dnsmasq.conf

EXPOSE 53

CMD ["/usr/sbin/dnsmasq", "-d"]
