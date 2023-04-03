# Intro

At the moment this is sort of a dumping ground for stuff that was written but didn't really fit in the section it was written.  I'll probably come back and finish the intro last...

During the development of this library, a few paths were gone done to arrive at the "best fit" solution.  Some of the critical decisions are highlighted below, provided with a bit of background for each.


Seeing as we are building bindings, this guide would be incomplete without a discussion on binding data from `C` for JS usage and vice versa.  There is a lot of good resource about this out there so no need to reinvent the wheel.  Follow the doc links below for more info on each.


In `C++` the best way keep track of allocations like that is RAII through implementation of a class that can cleanup everything.  In `C` the implementation just takes those member functions off the class and one creates a `struct` with associated free functions.  To CRUD the struct, the struct is generally passed as the first argument to the associated functions. For large `C` code bases it is debated whether an implied receiver is "better" than passing as an argument.

The ultimate decision came down to the `node-addon-api` being easier to work with.  The class structure makes a lot of well informed choices that are difficult to implement independently.  Async is very tricky because there are a lot of phases that need to be handled explicitly and the classes implement lines of code that would need to be hand written to make the `C` api "work".


## Using `n-api` vs `node-addon-api`



 I would definitely recommend that you read the [docs]() for `node-addon-api` but do so after reading the code segment below.