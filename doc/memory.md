# Memory Management

_**note:** This section was driven by my learning challenges and a very difficult bug induced by a compiler-generated function. Compiler-generated functions are a big reason hard-core `c` programmers do not like `c++`.  The bug is toward the end and may help bring it all together._

Stack and heap allocation are both similar and different to JS and it is important to understand the nuances because they have greatly influenced this library.  In  particular, focus on how everything gets freed.  It's easy to allocate memory but tracking and cleaning up the allocations is where the challenge lies.  Most of the paradigms in `c/c++` are inherently, or explicitly, implemented for resource/memory management.  Because this library is primarily `c++` we will use [RAII](https://en.cppreference.com/w/cpp/language/raii) and OOP to help us along with our journey.

On of the big things I noticed in my journey to native code is, in general, it is much easier to deal with stack allocated objects.  They are much more natural as it mimics JS but there are a few sticky wickets to pay attention to.

First is that not everything can be stack allocated (see the discussion about [blst](./blst.md) for a got-ya on the `blst::Pairing`).  Not only are there programmatic reasons, but there was another thing that kinda caught me by surprise at first.  Stack overflow is real and arrays have lots of stuff in them.  In native code there is the possibility that user data may be bigger than the stack can hold.  I know this all seems intuitive but in JS those are things we don't really think about.  This is a real and dangerous risk.

Another big piece is that in `c`, all functions are pass AND return by value.  Full stop.  It is possible to pass references and pointers yes, but those are also passed by value as they are both first class citizens.  As in, one creates a pointer and reference and then the value at that memory location gets copied into the new context.  The whole premise behind creating the references/pointers is that the "value" associated is much smaller so the copy operation is faster.  In generally a pointer is the same size as the system bytes (ie. 32-bit systems have 4 byte memory addresses and 64-bit systems have 8 byte memory addresses) and references depend on both system and compiler specifics.  Complex objects on the other hand can get VERY large.

While the solution to most efficiency problems will be passing by ref or pointer, the specifics of how to allocate and return need to be well understood to avoid segfault.  For the rest of this tutorial we will reference the following class:

```c++
class SomethingFancy {
    SomethingFancy(int &value) {}
};
```

## Allocation

As an example, async in JS can be a confusing thing for new developers. Some docs/blogs we can find are very early and use patterns like callbacks and some are from much later like async generators.  Along with structural language changes there have also been stylistic shifts over time.  This same thing happened in `c`/`c++`.  There are many ways to allocate in `c/c++`, just like in JS there are many ways to do async.

The differences that are seen across docs/blogs/etc stem from `c` being quite old and lots of patterns changed along the way.  Another piece is that `c` and `c++` are very similar, but they are not the same.  Much like TS is an extension of JS, `c++` is an extension of `c`.  So like JS/TS there are "`c` ways" and "`c++` ways" to do things and in many contexts both ways are "valid."

This was super confusing to me at first so we will go over a few examples with descriptions for clarity.  We will also look at "magic" `c++` function that bit me hard.

The following lines are NOT The same...

```c++
SomethingFancy a;
SomethingFancy b{42};
SomethingFancy c = SomethingFancy{123};
```

SomethingFancy 'a' is allocated and constructed using the "default constructor" and in this instance that is a "magic function" that is compiler created. 'b' is allocated and created in-place using the declared constructor as would be expected. 'c' is... complex. The compiler-created default constructor is being used to allocate memory at 'c' and a right-hand reference is created using the declared constructor.  Then the compiler-created destructor deletes the temporary at 'c' leaving an empty allocation, and then the value in the right-hand reference is copied to the allocation at 'c' using the compiler-created "magic" copy assignment operator.  Lots and lots of confusing compiler slight-of-hand.

While this is not intended to be a full tutorial these idea were something that definitely took getting used to and those "magic" functions are very hard to debug.  I would also like to make note that the above example is strictly a `c++` thing.  `SomethingFancy` is not a built in type and constructor syntax with an initializer list are not `c`, they are '`c++`'.  The ideas of right-hand reference, operator overloading and constructor/destructors are all "`++`" too.

```c
int a;
int b{42}; // not valid c, but is valid c++
int c = 42;
```

It is valid, and often times required, to allocate memory but to no initialize it.  In JS the uninitialized value is `undefined` in `c` using an uninitialized variable is "undefined behavior".  

With `c` as the context 'a' is uninitialized and can be dangerous. 'b' is invalid syntax and 'c' is an integer initialized to 42.

With `c++` as the context 'a' is treated the same as raw `c`. 'b' is an integer initialized to 42 using constructor syntax. 'c' is an integer initialized to 42 using assignment syntax.

## Passing To and Returning From Functions

Building functions happen for the same reasons in c as they do in JS.  They help to ease the mental burden for "what something does".  The differences in memory allocation drive very different coding paradigms though.

In modern JS we generally pass in what is needed inside the function context, return back the values that result and if an error occurs it is thrown.  That pattern generally holds true for both sync an async functions.

`C` stack-allocation semantics, and the resulting variable scoping, often result in a pattern where both input and output arguments are passed and then the function either returns `void` or `int` (to denote the error code where `0` represents no error) to show if valid execution occurred.  Generally one sees variables allocated for both inputs and return(s) in the calling context and then those variables are passed into the function.  Many times the function call is placed in a conditional to check execution status.

```c
KZGSettings settings; // this is the output of load_trusted_setup_file()
FILE *file_handle = fopen(******, "r"); // this is the input of load_trusted_setup_file()
C_KZG_RET ret = load_trusted_setup_file(&settings, file_handle);

if (fclose(file_handle) != 0) {
    if (ret == C_KZG_OK) {
        free_trusted_setup(&(data->settings));
    }
}

if (ret != C_KZG_OK) {
    return 1;
}

return 0;
```

There is one more paradigm that is worth explicitly stating.  Note in this example that `fclose` is in the conditional and `load_trusted_setup_file` is not.  `load_trusted_setup_file` is a function where the return value needs to be handled for either valid or invalid execution (ie valid but if fclose fails need to `free_trusted_setup` and for invalid execution the function returns `1`).  `fclose` however only requires that invalid execution requires further work.

There are a few challenges that emerge from the way that `c` functions are structured.  In very large code-bases its very difficult to track allocations and de-allocations because they do not always occur in the same functions.

In `c++` everything from above is true and there are some additional paradigms that should be presented.  Object have higher complexity for initialization/clean-up and bigger sizes.  Those "enhancements" and the `class` paradigm are where most of the complexity in `c++` (relative to `c`) comes in.  The trade of for the complexity is RAII.  Or i suppose RAII emerged because of the complexity and it is a very nice paradigm for large and complex systems.

RAII helps to overcome a lot of the challenges that emerge with allocations and de-allocations that occur in different locations in the codebase.  Most of the "magic" that happens in `c++` is the compiler filling in "defaults" so that the class structure isn't overly verbose.  It is not necessary to write functions for constructors, destructors, copy semantics nor move semantics.  They get "auto" generated for us, sometime with disastrous consequences.

The "rule of 3" and "rule of 5" were created to crystalize the mental paradigm so that developers do not get bitten by the magic/helpers that get induced.

## The "bug"

To be fair it happened two different times, in two slightly different contexts.  It's not a "bug", it's a "feature"...  I was attempting to create a vector of complex objects, that each had a `unique_ptr` as a member variable like this:

```c++
class PublicKey {
private:
    std::unique_ptr<blst::P1>;
}

main() {
    std::vector<PublicKey> arr;
    PublicKey key{...};
    arr.push_back(key) // segfault
}
```

There were a few iterations of this rough idea but the gist is that an invalid "default" function was causing a segfault. I had gone through a bunch of refactoring to remove the segfault so in some cases it was the copy constructor and other it was the move assignment operator overload.  Bottom line though is this is how I figured it out and that process was a huge learning hurdle for me.

## Finding and Fixing "the bug"

No matter how I wrote the code it did not work.  There was no obvious bugs in any of the code that I looked at and the truth is there were in-fact 0 bugs in the written code.  That is why I was not able to spot it.  The bug was in a compiler-generated function.

In order to find this elusive bug I had to learn to use the debugger.  I needed to step through execution to get more insight.  The obvious insight, that I kinda already figured out empirically, was the error was in the `push_back`.  But stepping-in led to a few "flashes/jumps" and bam segfault again.

I saw nothing helpful and was a bit defeated.  I had no more tutorials to watch, no more breadcrumbs to google and most importantly no idea what was causing the error. I ended up working on something else and came back to this after a refactor of some other stuff.

In between the first encounter and seeing the issue again under different circumstances I had really studied move semantics closely.  Specifically I learned to delete the operators and constructors that I did not want the compiler to auto-generate.

This time a lightning bolt struck.  The debugger stepped to the `= default` function declaration and I was able to see the name of the function causing the crash. I forget now if it was a move or a copy I was going for that attempt, but I hand wrote the "default" constructor and assignment-operator and finally saw what line the actual crash was on. After playing with it for a while the suite or problems stemmed from invalid smart pointer initialization or attempting to copy the `unique_ptr`, not move it (move semantics is not a default thing).

When in debugger mode, compiler-generated functions don't have a "line" to jump to because it's just the machine code that gets infilled.  The map doesn't have line reference so nothing shows and all one sees is flashes while the IDE is rendering whatever it is it renders in the instant before the debug segfault screen shows up.

Once I saw what happened it was a simple matter of googling the surrounding topic and the rule of 3 and 5 become prominent reminders of a hard faught battle.

## Closing Thoughts

It is simple to go watch some coding tutorials, like I did, and whip out a ton of code "that works".  Where most c/c++ code tutorials lack is this kind of stuff.  Best-practices.  Coding paradigms.  Relational anecdotes to paradigms I already understood...  The stuff that a senior dev would lean over and tell us Juniors if we still had a water cooler to talk by...

If you too have had a hard-fought win while learning system-level programming as a JS dev, this is the place to share that red badge of courage.