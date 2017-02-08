FROM ubuntu:14.04

MAINTAINER Nadine Luedicke

ENV REFRESHED_AT 2017-02-08

RUN apt-get update
RUN apt-get upgrade -y

RUN apt-get install -y nodejs

# needs this to find the nodejs exec
RUN ln -s /usr/bin/nodejs /usr/bin/node

RUN apt-get install -y npm
RUN /usr/bin/npm install websocket
RUN /usr/bin/npm install redis

ADD server/app.js /
ADD server/config.js /
ADD server/vws.socket.js /

ADD client/client.html /
ADD client/client.js /
ADD client/socket.js /

EXPOSE 8080

ENTRYPOINT ["/usr/bin/node", "app.js"]