#!/bin/bash

# When running tests in CI, for macos-latest they tend to randomly fail with SIGABRT
# This script attempts to reduce the need to re-run jobs on Github Actions manually

n=0
until [ "$n" -ge 3 ]; do
  node_modules/.bin/mocha test/**/* && break
  n=$((n+1)) 
done
