# Building Addon Code

## Build tools

It is possible to use a range of build tools but two are supported most readily.  `node-gyp` is the tool that node uses natively for building code at `install` time. `cmake.js` is an alternative to `node-gyp` and an extension of `CMake` for building javascript modules.

The `blst-ts` library is built with `node-gyp`.

## `node-gyp`

`node-gyp` is not known for being the most friendly build tool but there are a few tips here that will help make life easier when working with it.  It is a wrapper around `make` and will help to scaffold the files necessary (like `Makefile`'s) for compilation.

It builds both `Release` and `Debug` builds and that can be controlled with the `--debug` flag when running the `configure`, `build` or `rebuild` commands.

Before building one must first run `node-gyp configure` to setup the `build` folder. Note that running `npm install` automatically will run configure. You can read more about `node-gyp` commands [here](https://github.com/nodejs/node-gyp#how-to-use).

## `binding.gyp`

The complexity of `node-gyp` is not in its simple commands but its poorly documented configuration file named `binding.gyp`.  [This](https://github.com/nodejs/node-gyp#the-bindinggyp-file) is the example of the file in the docs which is of little use.  Under the [Further reading](https://github.com/nodejs/node-gyp#further-reading) heading there is a link to ["`binding.gyp` files out in the wild wiki page"](https://github.com/nodejs/node-gyp/blob/main/docs/binding.gyp-files-in-the-wild.md) and this is where one is expected to figure it out.  Another helpful resource was going through the list of packages that depend on `node-addon-api` and looking through those projects' `binding.gyp`.

Things to note are the keys 

- talk about `!` after prop names


## Adding a Library as a Dependency
