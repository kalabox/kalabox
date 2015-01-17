# docker build -t kalabox/nginx .

FROM kalabox/debian

ENV DEBIAN_FRONTEND noninteractive

# Install Nginx.
RUN \
  apt-get update && \
  apt-get install -y nginx dnsutils && apt-get clean

RUN chown -R www-data:www-data /var/lib/nginx

# The data container will manage these config files.
RUN rm /etc/nginx/nginx.conf
RUN ln -s /src/.kalabox/config/nginx/nginx.conf /etc/nginx/nginx.conf
RUN rm /etc/nginx/sites-enabled/default
RUN ln -s /src/.kalabox/config/nginx/site.conf /etc/nginx/sites-enabled/default

# Define working directory.
WORKDIR /etc/nginx

COPY start.sh /root/start.sh
RUN chmod 777 /root/start.sh

# Define default command.
CMD ["/root/start.sh"]

# Expose ports.
EXPOSE 80
EXPOSE 443
