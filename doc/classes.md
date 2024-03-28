# Classes

```c++
template <typename T>
class InstanceWrap {}

template <typename T>
class ObjectWrap : public InstanceWrap<T>, public Reference<Object> {}

template <typename T>
class Addon : public InstanceWrap<T> {}
```
