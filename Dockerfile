# This is used to build bindings for arm64

ARG NODE_VERSION
FROM matthewkeil/blst-ts-armbuild:${NODE_VERSION}

# NOTE: the artifacts of the build will be placed in /usr/src/blst-ts/prebuild
#       and that folder should be mounted as a volume when running the container
WORKDIR /usr/src/blst-ts
COPY . .

RUN yarn --ignore-optional

# Test - spec tests data should already be cached
RUN yarn download-spec-tests
RUN yarn test:spec
RUN yarn test:unit
