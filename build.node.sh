#!/bin/sh -e

BLST_NODE_OUTPUT=blst/bindings/node.js/blst.node
BLST_NODE_TARGET=dist/blst.node

# Copy SWIG prebuilt
cp blst_wrap.cpp blst/bindings/node.js

# Build node bindings
./blst/bindings/node.js/run.me

mkdir -p `dirname $BLST_NODE_TARGET`
cp $BLST_NODE_OUTPUT $BLST_NODE_TARGET
