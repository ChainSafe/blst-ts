# This is used to build bindings for arm64

ARG NODE_VERSION
FROM node:${NODE_VERSION}

RUN apt install -y python3 g++ make
# && ln -sf python3 /usr/bin/python
COPY . .

RUN yarn config set ignore-engines true
RUN yarn bootstrap

# Test - spec tests data should already be cached
RUN yarn download-spec-tests
RUN yarn test:unit
RUN yarn test:spec
