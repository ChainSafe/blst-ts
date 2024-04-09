# This is used to build and test bindings for linux-arm64

# The container that this is run FROM is hosted here
# https://hub.docker.com/repository/docker/matthewkeil/blst-ts-armbuild/general
#
# See the notes in Dockerfile.armEnv for more information on how to build and
# publish new versions

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
