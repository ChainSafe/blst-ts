# This is used to build bindings for arm64

ARG NODE_VERSION
FROM node:${NODE_VERSION}

# Install 'add-apt-repository'. Only available with apt-get, not apt
RUN apt-get update && apt-get install -y software-properties-common

# Install deps 
RUN apt update && apt install -y \
    build-essential \
    cmake \
    g++ \
    libbz2-dev \
    libffi-dev \
    libgdbm-dev \
    libncurses5-dev \
    libnss3-dev \
    libreadline-dev \
    libssl-dev \
    libsqlite3-dev \
    make \
    zlib1g-dev

RUN wget https://www.python.org/ftp/python/3.11.4/Python-3.11.4.tgz
RUN tar -xf Python-3.11.4.tgz
RUN cd Python-3.11.4 && ./configure
RUN cd Python-3.11.4 && make install
# From https://askubuntu.com/questions/1296790/python-is-python3-package-in-ubuntu-20-04-what-is-it-and-what-does-it-actually
# Unified way to create reliable symlink across distros
# Only arm arch for NodeJS version >= 18 need this link. Older versions don't have `python-is-python3`
RUN apt install python-is-python3 || echo "Ignore errors"

# NOTE: the artifacts of the build will be placed in /usr/src/blst-ts/prebuild
#       and that folder should be mounted as a volume when running the container
WORKDIR /usr/src/blst-ts
COPY . .

RUN yarn --ignore-optional

# Test - spec tests data should already be cached
RUN yarn download-spec-tests
RUN yarn test:spec
RUN yarn test:unit
