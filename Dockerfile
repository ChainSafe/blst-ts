# This is used to build bindings for arm64

FROM node:16

RUN apt install -y python3 g++ make
# && ln -sf python3 /usr/bin/python
COPY . .

RUN yarn bootstrap
