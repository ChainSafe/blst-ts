# This is used to build bindings for arm64

ARG NODE_VERSION
FROM node:${NODE_VERSION}

# Install 'add-apt-repository'
RUN apt-get update && apt-get install -y software-properties-common

# TODO [DA] look at optimizing the docker commands and building from source, since
# deadsnakes cannot be used as it is only for ubuntu LTS releases,
# not debian 9.x
RUN apt update && apt install -y build-essential zlib1g-dev libncurses5-dev libgdbm-dev libnss3-dev libssl-dev libsqlite3-dev libreadline-dev libffi-dev curl libbz2-dev g++ make
RUN wget https://www.python.org/ftp/python/3.10.0/Python-3.10.0.tgz
RUN tar -xf Python-3.10.0.tgz
# WORKDIR Python-3.10.0
RUN cd Python-3.10.0 && ./configure --enable-optimizations
RUN cd Python-3.10.0 && make -j8 altinstall
RUN ln -sf /usr/local/bin/python3.10 /usr/bin/python3

WORKDIR .
COPY . .

RUN yarn config set ignore-engines true
RUN yarn bootstrap

# Test - spec tests data should already be cached
RUN yarn download-spec-tests
RUN yarn test:unit
RUN yarn test:spec
