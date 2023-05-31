# Memory Model

## Kernel Memory Model

When developing C/C++ applications, understanding the memory model of the target operating system is crucial for efficient and correct program behavior. While there are differences between the memory models on Linux, macOS, and Windows, there are several core concepts that are consistent across these platforms. The differences are out of scope for this discussion as they are not relevant to native node addons.

1. **Virtual Memory**
    - Each C/C++ application operates within its own private virtual memory space on all three major platforms (Linux, macOS, and Windows). This space is divided into segments: text (for code), data (for static and global variables), stack (for function call stack), and heap (for dynamic memory allocation)
    - The virtual memory system translates the application's virtual addresses into physical addresses

2. **Memory Management**
   - On all three platforms, C applications can dynamically manage memory using functions like `malloc`, `calloc`, `realloc`, and `free`
   - C++ applications use `new` and `delete` to dynamically manage memory. The `new` operator is a wrapper around `malloc` and the `delete` operator is a wrapper around `free`
   - These functions are used to allocate or deallocate memory. The memory allocated is typically contiguous in the application's virtual address space
   - Importantly, while memory blocks allocated by functions like `malloc` or `new` appear contiguous in the virtual address space, they may not be contiguous in physical memory due to the translation between virtual and physical addresses

3. **Shared Libraries and Dynamic Linking**
   - All three platforms use a technique called dynamic linking, where shared libraries are mapped into an application's virtual memory space when the application is run
   - This allows multiple applications to share the same library code in memory, saving space
   - Dynamically linked libraries are loaded into memory one time, regardless of how many applications are using them.  They are loaded when the first application requires them and unloaded when the last application using them exits.
   - When the dynamic linker loads a shared library at the application level, it maps the library's code segment (text segment), which is read-only, into the process's address space. This segment can be shared between different processes because it is not modified at runtime
   - The data segment, which includes global and static variables, is mapped separately for each process. This is because these variables can be modified at runtime, and each process needs its own separate copy to prevent interference between processes

4. **Memory Protection**
   - Each of the three platforms (Linux, macOS, and Windows) provides memory protection to prevent one process from accessing the memory of another
   - This is enforced by the hardware, ensuring that each process can only access its own virtual memory

5. **Multi-Threading**
    - When a process spawns multiple threads, these threads share the process's memory space. This means that all threads have access to the same data and heap sections of the process's memory
    - Each thread gets its own stack, which is used for function calls, local variables, and return addresses. This is because each thread maintains its own call history and local variables, separate from other threads
    - The shared memory model is powerful because it allows threads to easily communicate and share data with each other. However, it also means that careful synchronization is required to avoid issues like race conditions, where the behavior of the program may depend on the precise timing of thread execution
    - Creating a thread is a very lightweight process because only the stack memory needs to be allocated

## Node.js Memory Model

Node relies on `V8` for managing its memory. There are some extensions to how the browser based implementation works, however there is not much practical difference. From a very high level there is stack and heap memory, as JavaScript is just a C++ application.  The stack only stores references to values. There are some exceptions to that rule but not many. However, for all intents and purposes data is stored in the heap. This section focuses on the specifics of how the heap is partitioned and how that impacts garbage collection. The [values section](./values.md) goes into more detail about `References`, `HandleScope`s and how to use the stack correctly.

Node uses a single process regardless of how many JavaScript threads are running. This is how it is able to share ArrayBuffer data across workers. When Node starts it requests some memory from the host for itself to spin up the JS environment, including an instance of `V8`. `V8` uses a series of classes to allocate memory and the [two highest on the hierarchy](https://github.com/nodejs/node/blob/4166d40d0873b6d8a0c7291872c8d20dc680b1d7/src/node.h#L510) are `MultiIsolatePlatform` and `ArrayBufferAllocator`.

### `ArrayBufferAllocator`

The `ArrayBufferAllocator` is a unique allocator within Node and is one of the very few that directly manages memory using `calloc` and `free`. Technically this area is not "allocated" by `V8` but rather it is just part of the virtual memory space created by the process. This is where Buffers live. When an `ArrayBuffer`, the backing store for all `Buffer`-like derivatives, [is created](https://github.com/nodejs/node/blob/4166d40d0873b6d8a0c7291872c8d20dc680b1d7/deps/v8/src/api/api.cc#L393) `calloc` [is called](https://github.com/nodejs/node/blob/4166d40d0873b6d8a0c7291872c8d20dc680b1d7/deps/v8/src/base/platform/memory.h#L64) and the OS allocates space within the confines of the virtual memory for the process. Any other objects that are created through `malloc/calloc`, by a native node addon, will also get stored in this "part" of the heap.

### `MultiIsolatePlatform` Data

The second major chunk of data for `V8` is called the Resident Set, and is broken into [these Spaces](https://github.com/nodejs/node/blob/4166d40d0873b6d8a0c7291872c8d20dc680b1d7/deps/v8/src/heap/heap.h#L2175). The memory for those spaces is organized [as follows](https://github.com/nodejs/node/blob/4166d40d0873b6d8a0c7291872c8d20dc680b1d7/deps/v8/src/common/globals.h#L980):

```c++
// NOTE: SpaceIterator depends on AllocationSpace enumeration values being
// consecutive.
enum AllocationSpace {
  RO_SPACE,         // Immortal, immovable and immutable objects,
  NEW_SPACE,        // Young generation space for regular objects collected
                    // with Scavenger/MinorMC.
  OLD_SPACE,        // Old generation regular object space.
  CODE_SPACE,       // Old generation code object space, marked executable.
  SHARED_SPACE,     // Space shared between multiple isolates. Optional.
  NEW_LO_SPACE,     // Young generation large object space.
  LO_SPACE,         // Old generation large object space.
  CODE_LO_SPACE,    // Old generation large code object space.
  SHARED_LO_SPACE,  // Space shared between multiple isolates. Optional.

  FIRST_SPACE = RO_SPACE,
  LAST_SPACE = SHARED_LO_SPACE,
  FIRST_MUTABLE_SPACE = NEW_SPACE,
  LAST_MUTABLE_SPACE = SHARED_LO_SPACE,
  FIRST_GROWABLE_PAGED_SPACE = OLD_SPACE,
  LAST_GROWABLE_PAGED_SPACE = SHARED_SPACE,
  FIRST_SWEEPABLE_SPACE = NEW_SPACE,
  LAST_SWEEPABLE_SPACE = SHARED_SPACE
};
```

As you can see above, while `V8` does manage the memory not all of it is handled by the garbage collector. Portions are used by node and `V8` for the process itself. Each of these [spaces](https://github.com/nodejs/node/blob/4166d40d0873b6d8a0c7291872c8d20dc680b1d7/deps/v8/src/heap/paged-spaces.h#L455) is composed of a set of pages allocated by the operating system in large chunks with [`mmap`](https://man7.org/linux/man-pages/man2/mmap.2.html) or [`MapViewOfFile`](https://docs.microsoft.com/en-us/windows/win32/api/memoryapi/nf-memoryapi-mapviewoffile) (on Windows). This is to avoid the overhead of calling `malloc` for each allocation.  The pages are then used by one of the various `V8` [allocator classes](https://github.com/nodejs/node/blob/4166d40d0873b6d8a0c7291872c8d20dc680b1d7/deps/v8/src/heap/cppgc/object-allocator.h#L39) and, in some instances, the garbage collector to manage process memory.

### Garbage Collected Memory

Only the New and Old Space are managed by the garbage collector. The New Space is further divided into two sections, the From and To spaces.  When the From space is full, the garbage collector will move all the live objects to the To space. The From and To spaces are then swapped. This is called a minor garbage collection. When the Old space is full, a major garbage collection is triggered. This is a much more expensive operation as it has to traverse the entire set of heap objects which are stored as a directed graph. After marking the liveness of objects the old space is swept and occasionally compacted to reduce fragmentation.

Most things are stored in this part of the heap.  This even includes modules loaded with the `require` keyword. See the [`reference section`](./reference.md#object-inheritance-hierarchy) and note the breadth of `HeapObject`s.

### Large Object Spaces

The Large Object Space is handled by the GC but objects here are never moved. They are strictly managed with the mark and sweep algorithm. Objects of size [greater than 2^16](https://github.com/nodejs/node/blob/4166d40d0873b6d8a0c7291872c8d20dc680b1d7/deps/v8/src/heap/cppgc/raw-heap.h#L31) get stored here.

### Code Spaces

This is where optimized code lives.  When code is first [`require`d](https://github.com/nodejs/node/blob/4166d40d0873b6d8a0c7291872c8d20dc680b1d7/lib/internal/bootstrap/loaders.js#L353) it converted from a `utf-8` string into a [JIT complied](https://github.com/nodejs/node/blob/4166d40d0873b6d8a0c7291872c8d20dc680b1d7/deps/v8/src/api/api.cc#L2708) function object.  The JSFunction object is then stored with the rest of the `HeapObject`s.  When the functions are run often they are converted to machine code. This is where the Turbofan and Torque optimizers come into play and the results are stored in here as optimized code. Subsequent calls to the optimized functions are executed from this space.

### Shared Spaces

This is where objects that can be shared across `Isolate`s are stored. The major drawback for this is that data tied to one `env` is not accessible within the other `env's` without help from `V8`. The code segments for this are quite complex and require further study, however there are some very interesting opportunities here to move data across the worker boundary.

## Node Addon Memory Model

Native node addons must comply with the models above, but give additional flexibility from working at the system level. The main complexity is hidden behind the `N-API` but a deep understanding of how references are counted, and how memory is allocated, helps build more performant code. See the [`values`](./values.md) section for more details.

The major difference between writing JS and writing native node code is that one can create native `C` classes and wrap them in JS objects that can used normally in JS code. The native objects are just plain old `JSObject`s with additional opaque native functionality. When a wrapped JS object is created with `new` the native class constructor is called the same way that any other function is called. A `CallbackInfo` object is passed and can be used by the native code to access the arguments passed to the constructor.  The native code then properly creates the native object and when the constructor returns, the native object is then wrapped in a JS object and returned to the caller.

Part of creating wrapped objects is [binding the native object](https://github.com/nodejs/node-addon-api/blob/665f4aa845f7191ec729ce3bd68a55f494c53750/napi.h#L2262) to `V8` so the engine knows what constructor function to call.  Similarly, the member methods are also announced to `V8` at the time the module is loaded. Once announced, if the method is called from JS, the native method is called and the `CallbackInfo` object is passed to the native code.  The native code can then use the `CallbackInfo` object to access the `this` object and any arguments passed to the method. In addition to methods that are accessible to JS, it is also possible to add native methods that are opaque to the runtime.

Native classes are stored the same way as every other `V8` object and are subject to the same rules that all `v8::Object`s are governed by. As an example, if the object is larger than 2^16 bytes it will be stored in the large object space which is only garbage collected via the slower mark and sweep algorithm.

There is also one other very important thing to remember.  JS objects are ONLY available while on the JS thread. Any call to [`Value`](https://github.com/nodejs/node-addon-api/blob/665f4aa845f7191ec729ce3bd68a55f494c53750/napi.h#L387) that happens off-thread will result in a hard, unrecoverable, `C` error. If data is needed both on and off thread it is helpful to store it in the heap natively and then store a smart pointer on the wrapped native object.

## `blst-ts` Memory Model

With the above as background the memory model for `blst-ts` is relatively straight forward. There are the PKI classes and some helper classes. There is also a `BlstAddon` class that holds global data. See [`Context-Awareness`](./structuring-addons.md#context-awareness) for more info on how to manage global data.

### PKI Classes

There are serialized and deserialized objects. Serialized objects are received over the network as byte arrays and handled as `Uint8Array`s. Deserialized objects are native classes that inherit from `ObjectWrap`. There were a few optimizations that were made when structuring the native classes.

First was to inherit from a base class that handles library errors. All errors are handled similarly and "gracefully." Every attempt was made to ensure no native stack unwinding. This is both for performance reasons and to make sure `C` errors do not leak. `C` errors are non-recoverable from JS and will cause a hard crash. If an error occurs it is set with `BlstBase::SetError` and this allows errors to be percolated to outer contexts without being thrown. This is how `Napi::AsyncWorker` handles things and is a good pattern to follow. It also makes error handling consistent across the library. The error string is stored in the `BlstBase` class and can be accessed via the `BlstBase::GetError` method.  There is a `BlstBase::HasError` helper to check if an error has occurred.  The `BlstBase` also holds a `Napi::Env` from the calling context and a pointer to the `BlstAddon` with the globals.

The second was to store `blst` objects as pointers and not directly as part of the the class memory layout. This will do a couple of things. First it will reduce the size of the object to help keep it in the new space.  The second, and arguably more important is that data can be accessed off-thread without having to copy it. An example of this is when using the `AsyncWorker` class and needing a `blst::P1` from a `PublicKey` for use during libuv execution. If the point is stored directly in the `PublicKey`, a `Value` is needed to be able to reference that native point. The `Value` will need to be created when the worker is setup and the point will need to be copied before the native function queues the async work. If the point is stored as a pointer on the `PublicKey` then only the pointer needs to be copied. This is also true for `blst::Pairing`s, which are quite large (4kb).

Smart pointers were used for all data that was natively heap allocated to prevent leakage.

## References

- [The Abstraction: Address Spaces](https://pages.cs.wisc.edu/~remzi/OSTEP/vm-intro.pdf)
- [Shared Libraries](https://tldp.org/HOWTO/Program-Library-HOWTO/shared-libraries.html)
- [Linkers and Loaders](https://wh0rd.org/books/linkers-and-loaders/linkers_and_loaders.pdf)
- [Mapping Files into Memory](https://www.oreilly.com/library/view/linux-system-programming/0596009585/ch04.html)
- [V8 Memory Management](https://deepu.tech/memory-management-in-v8/)
- [Heap Allocation of Everything](https://stackoverflow.com/questions/74004695/how-v8-handle-stack-allocated-variable-in-closure)
- [Slack Tracking](https://v8.dev/blog/slack-tracking)
- [Understanding Worker Threads in Node.js](https://nodesource.com/blog/worker-threads-nodejs/)
- [v8::ResourceConstraints](https://github.com/nodejs/node/blob/4166d40d0873b6d8a0c7291872c8d20dc680b1d7/deps/v8/include/v8-isolate.h#L62)

## Other Code References

- [struct SlotTraits](https://github.com/nodejs/node/blob/4166d40d0873b6d8a0c7291872c8d20dc680b1d7/deps/v8/src/common/globals.h#L928-L930)
