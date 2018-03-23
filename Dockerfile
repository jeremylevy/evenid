# Start from Ubuntu
FROM ubuntu:latest

MAINTAINER Jeremy Levy <jje.levy@gmail.com>

# Prefix used to fix 
# http://askubuntu.com/questions/506158/unable-to-initialize-frontend-dialog-when-using-ssh
RUN DEBIAN_FRONTEND=noninteractive \
    apt-get update -y

RUN DEBIAN_FRONTEND=noninteractive \
    apt-get install -y \
    sudo

RUN DEBIAN_FRONTEND=noninteractive \
    sudo apt-get update -y

RUN DEBIAN_FRONTEND=noninteractive \
    sudo apt-get dist-upgrade -y

RUN DEBIAN_FRONTEND=noninteractive \
    sudo apt-get install -y \
    curl \
    git

# For Node.js
RUN curl -sL https://deb.nodesource.com/setup_4.x | sudo bash -

# `libkrb5-dev` needed to compile
# `node-gyp`
RUN DEBIAN_FRONTEND=noninteractive \
    sudo apt-get install -y \
    build-essential \
    gcc \
    libkrb5-dev \
    imagemagick \
    make \
    nodejs \
    python=2.7* \
    ruby-full \
    rubygems-integration

RUN gem install foreman

# Don’t rebuild modules each time 
# you re-build your container
ADD package.json /tmp/package.json

RUN cd /tmp && npm cache clean && npm install

RUN mkdir -p /opt/evenIDAPP && cp -a /tmp/node_modules /opt/evenIDAPP

WORKDIR /opt/evenIDAPP
ADD . /opt/evenIDAPP

ENTRYPOINT ["/bin/bash", "-c"]

CMD ["${START_CMD}"]

EXPOSE 7000