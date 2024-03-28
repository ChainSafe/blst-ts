
```c++
inline const std::string& Error::Message() const NAPI_NOEXCEPT {
  if (_message.size() == 0 && _env != nullptr) {
#ifdef NAPI_CPP_EXCEPTIONS
    try {
      _message = Get("message").As<String>();
    } catch (...) {
      // Catch all errors here, to include e.g. a std::bad_alloc from
      // the std::string::operator=, because this method may not throw.
    }
#else  // NAPI_CPP_EXCEPTIONS
#if defined(NODE_ADDON_API_ENABLE_MAYBE)
    Napi::Value message_val;
    if (Get("message").UnwrapTo(&message_val)) {
      _message = message_val.As<String>();
    }
#else
    _message = Get("message").As<String>();
#endif
#endif  // NAPI_CPP_EXCEPTIONS
  }
  return _message;
}
```
