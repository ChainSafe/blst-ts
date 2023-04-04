# Errors

It is [possible](https://github.com/nodejs/node-addon-api/blob/main/doc/setup.md) to build Addons with, or without, errors turned on.  It was [one](./intro.md#error-handling) of the decisions that was made when implementing this library.

## `C` Errors

There is no `throw` keyword in `C`. See [Passing and Returning from Functions](./js-perspective-on-c.md#passing-to-and-returning-from-functions) for more information. Make sure to check all `napi_status` return values. How errors are queued on the `napi_env` is beyond the scope of this document.

## `C++` Errors

It's possible to `throw` when building as `C++`. Errors that get `throw`n percolate up to the JS context.

```c++
throw Napi::Error::New(env, "The answer is NOT 42!!!");
```

My understanding is stack unwinds are more "violent" at the native level, so it is also possible to hail errors in JS but execution to run smoothly in `C++`.

```c++
if (answer != 42) {
    Napi::Error::New(env, "Something went wrong!").ThrowAsJavaScriptException();
    return env.Undefined();
}
```

In that situation the native function returns cleanly and the JS function will throw as expected.  It should be noted that it is still possible for an underlying library error to throw with exceptions turned on.

## Turning `C++` Exceptions Off

This is possible but not something implemented in `@chainsafe/blst-ts`.  In [Napi::Value](./values.md#napi-values) there was mention about `Napi::Maybe` and this is what it is for.  It represents the potential for a value to get returned. In error cases the maybe is empty. See [this](https://github.com/nodejs/node-addon-api/blob/main/doc/error_handling.md#examples-with-maybe-type-and-c-exceptions-disabled) section of the `node-addon-api` for more info.
