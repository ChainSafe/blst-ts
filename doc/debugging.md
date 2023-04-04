# Debugging Addons

Special thanks to [@a7ul](https://github.com/a7ul/) for writing [this](https://medium.com/@a7ul/debugging-nodejs-c-addons-using-vs-code-27e9940fc3ad) blog post.  It was very helpful.

[This](https://github.com/nodejs/node/issues/26667) issue in `nodejs/node` also gave a lot of insight and a [comment](https://github.com/nodejs/node/issues/26667#issuecomment-475329557) provided a good combination of `valgrind` flags to successfully highlight a memory leak using `Docker` on my mac.

## Setting-Up `Valgrind`

## Debugging by Example

_**note:** This section was driven by a learning challenge. There was a very difficult bug that was induced by a compiler-generated function. Compiler-generated functions are a big reason hard-core `c` programmers do not like `c++`, but that is a hotly debated topic.


### The "bug"

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

### Finding and Fixing "the bug"

No matter how I wrote the code it did not work.  There was no obvious bugs in any of the code that I looked at and the truth is there were in-fact 0 bugs in the written code.  That is why I was not able to spot it.  The bug was in a compiler-generated function.

In order to find this elusive bug I had to learn to use the debugger.  I needed to step through execution to get more insight.  The obvious insight, that I kinda already figured out empirically, was the error was in the `push_back`.  But stepping-in led to a few "flashes/jumps" and bam segfault again.

I saw nothing helpful and was a bit defeated.  I had no more tutorials to watch, no more breadcrumbs to google and most importantly no idea what was causing the error. I ended up working on something else and came back to this after a refactor of some other stuff.

In between the first encounter and seeing the issue again under different circumstances I had really studied move semantics closely.  Specifically I learned to delete the operators and constructors that I did not want the compiler to auto-generate.

This time a lightning bolt struck.  The debugger stepped to the `= default` function declaration and I was able to see the name of the function causing the crash. I forget now if it was a move or a copy I was going for that attempt, but I hand wrote the "default" constructor and assignment-operator and finally saw what line the actual crash was on. After playing with it for a while the suite or problems stemmed from invalid smart pointer initialization or attempting to copy the `unique_ptr`, not move it (move semantics is not a default thing).

When in debugger mode, compiler-generated functions don't have a "line" to jump to because it's just the machine code that gets infilled.  The map doesn't have line reference so nothing shows and all one sees is flashes while the IDE is rendering whatever it is it renders in the instant before the debug segfault screen shows up.

Once I saw what happened it was a simple matter of googling the surrounding topic and the rule of 3 and 5 become prominent reminders of a hard faught battle.