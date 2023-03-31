# JavaScript Values and The Reference System

Seeing as we are building bindings, this guide would be incomplete with a discussion on binding data from `C` for JS usage and vice versa.  There is a lot of good resource about this out there so no need to reinvent the wheel.  Follow the doc links below for more info on each.

There are a few things that should prepend the discussion before dive deeper.  There is a paradigm shift that one must undergo to really grok how JavaScript values exist and how we can access them.  The JS runtime is a running application that we have API access to and it is responsible for getting us access to JS values.  Most values exist on the heap.  I know that JS says stuff is passed by value but the ACTUAL values are mostly stored in the heap.  When we are passing around `napi_value`s we are copying (or not if we are smart about stuff) pointers to the heap data.

That heap data is managed by the JS engine, which means that the data is also MOVED by the engine without notice. It is also actively cleaned up by the almighty garbage collector.  This is a process that can be fraught for native code developers as native code runs outside of the JS context and therein lies the reason for the rest of the content below.  

We will need to pay attention to what handles are announced to the GC to make sure that it does not sweep something we still need. It could (and will likely) result in a segfault. This is what the `Reference` system is for.  We can either manually copy data around or we can lean on that same system.  There are several `Reference` types available to us, and we will talk a bit about them all.

We will also cover how to access values in the JS runtime.  How values work when native code is actively running on thread.  How context in `C` affects context in JS and vice versa.  Just because a function has not returned DOES NOT mean that the stack-allocated value in `C` is still alive.  Yes, really...

## JavaScript Values

The base type that all other types extend is the `napi_value` or `Napi::Value`.  There is also the idea of `Napi::Maybe` floating above that, but that topic is out of scope for this discussion.  For all intensive purposes, when you ask the engine for some data, it will return a value.  It is then the job of the implementer to suss out what type of value it is and then to convert it to the underlying, and actually useful, data that system level code can interpret.

This is the inheritance hierarchy for `Napi::Value`:

```c++
class Boolean : public Value {}
class Number : public Value {}
class Number : public Value {}
class BigInt : public Value {}
class Date : public Value {}
// This one surprised me.  I always thought date was an Object...

class Name : public Value {}
class String : public Name {}
class Symbol : public Name {}

class TypeTaggable : public Value {}
class External : public TypeTaggable {}
class Object : public TypeTaggable {}

class Array : public Object {}
class Function : public Object {}
class Promise : public Object {}
class DataView : public Object {}
class ArrayBuffer : public Object {}
class TypedArray : public Object {}

template <typename T>
class TypedArrayOf : public TypedArray {}
using Uint8Array = TypedArrayOf<uint8_t>;
class Buffer : public Uint8Array {}
```

I will let a segment from the `node-addon-api` speak for itself...

```c++
/// A JavaScript value of unknown type.
///
/// For type-specific operations, convert to one of the Value subclasses using a
/// `To*` or `As()` method. The `To*` methods do type coercion; the `As()`
/// method does not.
///
///     Napi::Value value = ...
///     if (!value.IsString()) throw Napi::TypeError::New(env, "Invalid
///     arg..."); Napi::String str = value.As<Napi::String>(); // Cast to a
///     string value
///
///     Napi::Value anotherValue = ...
///     bool isTruthy = anotherValue.ToBoolean(); // Coerce to a boolean value
class Value {
 public:
  Value();  ///< Creates a new _empty_ Value instance.
  Value(napi_env env,
        napi_value value);  ///< Wraps a Node-API value primitive.

  /// Creates a JS value from a C++ primitive.
  ///
  /// `value` may be any of:
  /// - bool
  /// - Any integer type
  /// - Any floating point type
  /// - const char* (encoded using UTF-8, null-terminated)
  /// - const char16_t* (encoded using UTF-16-LE, null-terminated)
  /// - std::string (encoded using UTF-8)
  /// - std::u16string
  /// - napi::Value
  /// - napi_value
  template <typename T>
  static Value From(napi_env env, const T& value);

  /// Converts to a Node-API value primitive.
  ///
  /// If the instance is _empty_, this returns `nullptr`.
  operator napi_value() const;

  /// Gets the environment the value is associated with.
  Napi::Env Env() const;

  /// Checks if the value is empty (uninitialized).
  ///
  /// An empty value is invalid, and most attempts to perform an operation on an
  /// empty value will result in an exception. Note an empty value is distinct
  /// from JavaScript `null` or `undefined`, which are valid values.
  ///
  /// When C++ exceptions are disabled at compile time, a method with a `Value`
  /// return type may return an empty value to indicate a pending exception. So
  /// when not using C++ exceptions, callers should check whether the value is
  /// empty before attempting to use it.
  bool IsEmpty() const;

  napi_valuetype Type() const;  ///< Gets the type of the value.

  bool IsUndefined()
      const;            ///< Tests if a value is an undefined JavaScript value.
  bool IsNull() const;  ///< Tests if a value is a null JavaScript value.
  bool IsBoolean() const;  ///< Tests if a value is a JavaScript boolean.
  bool IsNumber() const;   ///< Tests if a value is a JavaScript number.
#if NAPI_VERSION > 5
  bool IsBigInt() const;  ///< Tests if a value is a JavaScript bigint.
#endif                    // NAPI_VERSION > 5
#if (NAPI_VERSION > 4)
  bool IsDate() const;  ///< Tests if a value is a JavaScript date.
#endif
  bool IsString() const;  ///< Tests if a value is a JavaScript string.
  bool IsSymbol() const;  ///< Tests if a value is a JavaScript symbol.
  bool IsArray() const;   ///< Tests if a value is a JavaScript array.
  bool IsArrayBuffer()
      const;  ///< Tests if a value is a JavaScript array buffer.
  bool IsTypedArray() const;  ///< Tests if a value is a JavaScript typed array.
  bool IsObject() const;      ///< Tests if a value is a JavaScript object.
  bool IsFunction() const;    ///< Tests if a value is a JavaScript function.
  bool IsPromise() const;     ///< Tests if a value is a JavaScript promise.
  bool IsDataView() const;    ///< Tests if a value is a JavaScript data view.
  bool IsBuffer() const;      ///< Tests if a value is a Node buffer.
  bool IsExternal() const;  ///< Tests if a value is a pointer to external data.

  /// Casts to another type of `Napi::Value`, when the actual type is known or
  /// assumed.
  ///
  /// This conversion does NOT coerce the type. Calling any methods
  /// inappropriate for the actual value type will throw `Napi::Error`.
  template <typename T>
  T As() const;

  MaybeOrValue<Boolean> ToBoolean()
      const;  ///< Coerces a value to a JavaScript boolean.
  MaybeOrValue<Number> ToNumber()
      const;  ///< Coerces a value to a JavaScript number.
  MaybeOrValue<String> ToString()
      const;  ///< Coerces a value to a JavaScript string.
  MaybeOrValue<Object> ToObject()
      const;  ///< Coerces a value to a JavaScript object.

 protected:
  napi_env _env;
  napi_value _value;
};
```

## The Reference System

 The second inherited tree for the Reference system

```c++
/// Holds a counted reference to a value; initially a weak reference unless
/// otherwise specified, may be changed to/from a strong reference by adjusting
/// the refcount.
///
/// The referenced value is not immediately destroyed when the reference count
/// is zero; it is merely then eligible for garbage-collection if there are no
/// other references to the value.
template <typename T>
class Reference {}

class ObjectReference : public Reference<Object> {}
class FunctionReference : public Reference<Function> {}
class Error : public ObjectReference {}
class TypeError : public Error {}
class RangeError : public Error {}
```

## Passing data to Native Code

We will reference a few sections from the `node-addon-examples`:

- [Passing base data types to C]()

## Returning Data from Native Code

## Referencing Data
