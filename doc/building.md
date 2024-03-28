# Building Addons

## Build tools

It is possible to use a range of build tools but two are supported most readily.  `node-gyp` is the tool that node uses natively for building code at `install` time. `cmake.js` is an alternative to `node-gyp` and an extension of `CMake` for building javascript modules.

The `blst-ts` library is built with `node-gyp`.

## `node-gyp`

`node-gyp` is not known for being the most friendly build tool, but there are a few tips here that will help make life easier when working with it.  It is a wrapper around `make` and will help to scaffold the files necessary (like `Makefile`'s) for compilation.

It builds both `Release` and `Debug` builds and that can be controlled with the `--debug` flag when running the `configure`, `build` or `rebuild` commands.

Before building one must first run `node-gyp configure` to setup the `build` folder. Note that running `npm install` automatically will run configure. You can read more about `node-gyp` commands [here](https://github.com/nodejs/node-gyp#how-to-use).

## `node-gyp` dependencies

There is a common issue that comes up regarding `python` versions when installing and running `node-gyp`.  Newer versions of mac have `python3` by default and `node-gyp` will not correctly find it on the `PATH`.  There are a few options to resolve this but the easiest is to use `pyenv` to manage the versions that are installed and used.

## `binding.gyp`

The complexity of `node-gyp` is not in its simple commands but its poorly documented configuration file named `binding.gyp`.  [This](https://github.com/nodejs/node-gyp#the-bindinggyp-file) is the example of the file in the docs which is of little use.  Under the [Further reading](https://github.com/nodejs/node-gyp#further-reading) heading there is a link to ["`binding.gyp` files out in the wild wiki page"](https://github.com/nodejs/node-gyp/blob/main/docs/binding.gyp-files-in-the-wild.md) and this is where one is expected to figure it out.  Another helpful resource was going through the list of packages that depend on `node-addon-api` and looking through those projects' `binding.gyp`.

### `binding.gyp` Keys

There is not a great resource for what each of the properties of the "object" that is in the `binding.gyp` file does.  Hopefully the information below will make it a less confusing tool.

#### `target_name`

There are some nuances that will prevent the project from building or the `bindings` package from working correctly.  In particular paying attention to the name of the `class` that implements `Napi::Addon` as that will get passed through and override the `target_name` field. There is also potentially a bug during linking if the `target_name` and entry filename don't match.

#### `sources`

This is a array of implementation files to compile. Generally this is a list of `.c`, `.cc`, or `.cpp` files (can be any c-compatible extension).

#### `dependencies`

It is possible to use properly formatted `node_modules` as dependencies. Check out how `node-addon-api` is structured for an example of this.

#### `libraries`

Use this to statically link to libraries

```json
"libraries": [
    "-lsodium",
    "<(module_root_dir)/deps/libblst.a",
],
```

#### `include_dirs`

This is the equivalent to `include` directories in `make` or `CMake`.  It is a list of directories that will be searched for header files.  Anything placed here will be available in source files without a relative path.

```c
#include "napi.h"
```

#### `defines`

Preprocessor definitions that will be available at compile time.  It is possible to pass with or "without" a value.

```json
"defines": [
  "NAPI_EXPERIMENTAL",
  "NAPI_DISABLE_CPP_EXCEPTIONS",
  "LIB_FANCY_SOME_ENV_VAR=<!(echo ${LIB_FANCY_SOME_ENV_VAR:-4096})"
]
```

#### `cflags`

Flags passed to the compiler when building C files.

#### `cflags_cc`

Flags passed to the compiler when building C++ files.

#### Inverse Flags

It is possible to inverse the flags passed to the compiler.  For example, if you want to remove a default flag you can do so by adding the a `!` after the type of flag to reverse.

```json
"cflags!": ["-fno-exceptions"],
```

#### `conditions`

Any key/value pair can be overridden by a condition.  This is useful for platform specific flags.

```json
"conditions": [
    ["OS!='win'", {
        "sources": ["deps/blst/build/assembly.S"],
        "defines": [
            "FIELD_ELEMENTS_PER_BLOB=<!(echo ${FIELD_ELEMENTS_PER_BLOB:-4096})"
        ],
        "cflags_cc": [
            "-std=c++17",
            "-fPIC"
        ]
    }],
    ["OS=='win'", {
        "sources": ["deps/blst/build/win64/*-x86_64.asm"],
        "defines": [
            "_CRT_SECURE_NO_WARNINGS",
            "FIELD_ELEMENTS_PER_BLOB=<!(powershell -Command \"if ($env:FIELD_ELEMENTS_PER_BLOB) { $env:FIELD_ELEMENTS_PER_BLOB } else { 4096 }\")"
        ],
        "msbuild_settings": {
            "ClCompile": {
                "AdditionalOptions": ["/std:c++17"]
            }
        }
    }],
    ["OS=='mac'", {
        "xcode_settings": {
        "CLANG_CXX_LIBRARY": "libc++",
        "MACOSX_DEPLOYMENT_TARGET": "13.0"
        }
    }]
]
```

## Adding a Library as a Dependency

There are a few ways to add a dependency using `node-gyp`.  The easiest way, by far, is to add the pertinent files to `sources`. This will make sure that everything is built on the target system (at install time) and with a single build tool to promote compatibility.

```json
"sources": [
    "<(module_root_dir)/deps/blst/src/server.c",
]
```

The second, and much less desirable way, is to build the dependency separately and then link it to the project.  This is a bit more complicated and requires a bit more knowledge of the full build toolchain.  It is much more likely to break, as dependencies may be built incompatibly. Using this approach has two flavors.

### Linking a Static Library

It is possible to write a script that is used as an entrance to run `node-gyp`.  One would build the dependency and then run `node-gyp` to build the bindings.  To make sure the entry script runs, execute it as the "install" in `package.json`.

To add a static library use the `libraries` key like:

```json
"libraries": ["<(module_root_dir)/libblst.a"]
```

### Separate Build Actions

The most complex way is adding build actions to have `node-gyp` build all targets.  `make` is the ultimate tool doing the builds and knowing that makes the inputs and outputs a bit more understandable. They are used to determine if a build is necessary and must match exactly or nothing happens (everything is done).

These actions must also take into account cross-platform compatibility.  Actions do not support `conditions` so its challenging to craft commands without a build script.

```json
"actions": [
    {
        "action_name": "build_blst",
        "inputs": ["<(module_root_dir)/dist/deps/blst/build.sh"],
        "outputs": ["<(module_root_dir)/libblst.a"],
        "action": ["<(module_root_dir)/dist/deps/blst/build.sh"]
    },
    {
        "action_name": "build_ckzg",
        "inputs": [
            "<(module_root_dir)/dist/deps/c-kzg/c_kzg_4844.c",
            "<(module_root_dir)/libblst.a"
        ],
        "outputs": ["<(module_root_dir)/c_kzg_4844.o"],
        "action": [
            "cc",
            "-I<(module_root_dir)/dist/deps/blst/bindings",
            "-DFIELD_ELEMENTS_PER_BLOB=<!(echo ${FIELD_ELEMENTS_PER_BLOB:-4096})",
            "-O2",
            "-c",
            "<(module_root_dir)/dist/deps/c-kzg/c_kzg_4844.c"
        ]
    }
]
```

## Adding a Dependency that is Part of Node

As an example, `@chainsafe/blst-ts` uses `openssl` to generate random bytes. Node.js uses OpenSSL [internally](https://nodejs.org/api/crypto.html) and links it [statically by default](https://github.com/nodejs/node/blob/c94be4125bfbc68e4cd9cbec27676347a314997d/configure.py#L355). When you build a native addon with node-gyp, you are linking your addon with the Node.js binary, which already has the OpenSSL library linked in. This is the reason you don't need to explicitly specify the `-lopenssl` in `binding.gyp` file.

When you include an OpenSSL header file like <openssl/rand.h> in your native addon and use its functions, the linker resolves the corresponding OpenSSL symbols during the build process because [node-gyp knows](https://nodejs.org/api/addons.html#linking-to-libraries-included-with-nodejs) they are part of the Node.js binary.

At runtime, when Node.js loads (dynamically links) the native addon using require, your addon is able to access the OpenSSL functions because those functions are part of the Node.js binary.

### Other `node-gyp` Targets

```json
{
    "target_name": "action_after_build",
    "type": "none",
    "dependencies": ["kzg"],
    "copies": [
        {
            "files": ["./build/Release/kzg.node"],
            "destination": "./dist"
        },
        {
            "files": ["./build/Release/kzg.node"],
            "destination": "./"
        }
    ]
}
```
