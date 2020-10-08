#!/bin/sh -e

BLST_WRAP_PREBUILD=blst_wrap.cpp
BLST_WRAP_OUTPUT=blst/bindings/node.js
BLST_NODE_OUTPUT=blst/bindings/node.js/blst.node
BLST_NODE_TARGET=build/blst.node

cp $BLST_WRAP_PREBUILD $BLST_WRAP_OUTPUT

(cd blst/bindings/node.js; ./run.me)

mkdir -p `dirname $BLST_NODE_TARGET`
cp $BLST_NODE_OUTPUT $BLST_NODE_TARGET
