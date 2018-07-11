# pact
Promises Library

Fully Standards compliant (At least passes all tests): https://promisesaplus.com/

And implements a extra facility called Pact.any() which will return first non errored promise, unless all errored in the iterator. These are not well tested though. Pact.all(), Pact.race(), Pact.resolve(x), Pact.reject(e) work according to ECMA spec. 

My original code was about 5 times faster than bluebird, but by the time I added all the thenable support and clean stack requirements, it is now way slower. Why we need thenables :(, I will see if I can make it faster even with thenables.

I hope it is at least one of the smallest Promises library that passes all tests!
