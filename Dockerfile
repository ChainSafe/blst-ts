FROM node:alpine

RUN apk add --update --no-cache python3 g++ make && ln -sf python3 /usr/bin/python
COPY . .

# Required for `--platform linux/arm64` for some reason it can't find python
RUN PYTHON="/usr/bin/python" node dist/scripts/install.js
RUN ls prebuild

RUN uname -a
