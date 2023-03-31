# Intro

During the development of this library, a few paths were gone done to arrive at the "best fit" solution.  Some of the critical decisions are highlighted below, provided with a bit of background for each.


Seeing as we are building bindings, this guide would be incomplete without a discussion on binding data from `C` for JS usage and vice versa.  There is a lot of good resource about this out there so no need to reinvent the wheel.  Follow the doc links below for more info on each.


## Using `n-api` vs `node-addon-api`



 I would definitely recommend that you read the [docs]() for `node-addon-api` but do so after reading the code segment below.