# Environment

The first argument of every `napi` function is an `napi_env` object. This object represents the environment in which a function was called. `Napi::Env` is the `C++` wrapper around `napi_env`, which more specifically is an [opaque structure](https://github.com/nodejs/node/blob/4166d40d0873b6d8a0c7291872c8d20dc680b1d7/src/js_native_api_types.h#L24) whose [implementation](https://github.com/nodejs/node/blob/4166d40d0873b6d8a0c7291872c8d20dc680b1d7/src/js_native_api_v8.h#L52) instructs how the underlying constructs all relate to each other.  It is a abi-stable simplification of the full [node::Environment](https://github.com/nodejs/node/blob/4166d40d0873b6d8a0c7291872c8d20dc680b1d7/src/env.h#L533)

## Bringing It All Together

The `node::Environment` is where the [`v8::Isolate`](https://github.com/nodejs/node/blob/4166d40d0873b6d8a0c7291872c8d20dc680b1d7/src/env.h#L1001) meets, [`libuv`](https://github.com/nodejs/node/blob/4166d40d0873b6d8a0c7291872c8d20dc680b1d7/src/env.h#L1003-L1009) and the [process meta](https://github.com/nodejs/node/blob/4166d40d0873b6d8a0c7291872c8d20dc680b1d7/src/env.h#L1039-L1050).

"[Environment](https://github.com/nodejs/node/blob/4166d40d0873b6d8a0c7291872c8d20dc680b1d7/src/env.h#L533) is a per-isolate data structure that represents an execution environment. Each environment has a principal realm and can create multiple subsidiary synthetic realms." `node::Realm` is a container for a set of JavaScript objects and functions that associated with a particular global environment.

While `v8` does manage "all thing JavaScript", the event loop is not actually part of the JavaScript spec.  [Event Loops](https://html.spec.whatwg.org/multipage/webappapis.html#event-loops) are included as part of the html spec and are implemented by the browser, not the engine. `libuv` provides the Node.js event loop and the asynchronous callback (and I/O) abstraction.  The `Environment` is the glue that binds everything together.
