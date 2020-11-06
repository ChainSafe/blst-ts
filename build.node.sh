# Edit run.me script to debub macos builds
cp ./run.me blst/bindings/node.js/run.me

cp blst_wrap.cpp blst/bindings/node.js/blst_wrap.cpp

(cd blst/bindings/node.js; ./run.me)

mkdir -p build
cp blst/bindings/node.js/blst.node build/blst.node
