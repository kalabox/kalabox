FROM ubuntu

RUN apt-get update && apt-get upgrade
RUN apt-get -y install git nodejs npm

# App directory
RUN mkdir /srv/app
# Grab sinker
RUN git clone https://github.com/substack/sinker.git /srv/app/sinker
# Copy the app file
ADD server.js /srv/app/

# Run npm install in the sinker dir
WORKDIR /srv/app/sinker/
RUN npm install

# Add volume and test file
WORKDIR /srv/app

# Sinker listens on port 5000
EXPOSE 5000

CMD ["nodejs", "server.js", "/data/code/"]
