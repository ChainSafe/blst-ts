# Definitions

## `Isolate`

A `v8::Isolate` is the representation of a complete JavaScript execution environment.  It manages execution flow, the stack and the garbage collector.  It is also the place where all the JavaScript "values" live.

## `HandleScope`

`Napi::HandleScope` is the abi-stable representation of the [HandleScopeWrapper](https://github.com/nodejs/node/blob/4166d40d0873b6d8a0c7291872c8d20dc680b1d7/src/js_native_api_v8.cc#L113) around a [`v8::HandleScope`](https://github.com/nodejs/node/blob/4166d40d0873b6d8a0c7291872c8d20dc680b1d7/deps/v8/include/v8-local-handle.h#L77).

## `v8::Context`

`Context` is a sand-boxed execution environment that allows separate, unrelated, JavaScript code to run in a single instance of the JavaScript engine. The JavaScript virtual machine implements the [Command Pattern](https://en.wikipedia.org/wiki/Command_pattern), and each message in the callback queue is a "request for invocation" in an explicit evaluation context.  The context does a few things but most importantly is setting up the lexical environment associated with the function.

This is an excerpt from "context.h":

```c++
/**
 * JSFunctions are pairs (context, function code), sometimes also called
 * closures. A Context object is used to represent function contexts and
 * dynamically pushed 'with' contexts (or 'scopes' in ECMA-262 speak).
 *
 * At runtime, the contexts build a stack in parallel to the execution
 * stack, with the top-most context being the current context. All contexts
 * have the following slots:
 *
 * [ scope_info     ]  This is the scope info describing the current context. It
 *                     contains the names of statically allocated context slots,
 *                     and stack-allocated locals.
 *
 * [ previous       ]  A pointer to the previous context.
 */
class Context : public TorqueGeneratedContext<Context, HeapObject> {
/*
 * Lookup the slot called 'name', starting with the current context.
 * There are three possibilities:
 *
 * 1) result->IsContext()
 *
 * 2) result->IsJSObject():
 *    The binding was found as a named property in a context extension
 *    object, as a property on the subject, or as a property of the global
 *    object.
 *
 * 3) result->IsModule():
 *
 * 4) result.is_null():
 *    There was no binding found
 */
static Handle<Object> Lookup(
    Handle<Context> context,
    Handle<String> name,
    ...);
}
```
