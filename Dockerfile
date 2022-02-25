# This is used to build bindings for arm64

ARG NODE_VERSION
FROM node:${NODE_VERSION}

# node-gyp v8.4.0 requires python >= 3.6.0
# 'ppa:deadsnakes/ppa' is repository to install newer versions
RUN add-apt-repository ppa:deadsnakes/ppa \
  && apt-get update \
  && apt-get install -y python3.6 g++ make \
  && apt-get clean \
  && ln -sf python3.6 /usr/bin/python3

COPY . .

RUN yarn config set ignore-engines true
RUN yarn bootstrap

# Test - spec tests data should already be cached
RUN yarn download-spec-tests
RUN yarn test:unit
RUN yarn test:spec
