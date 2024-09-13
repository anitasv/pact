# pact
Probably the smallest promises library that pass all tests!

<a href="https://promisesaplus.com/">
    <img src="https://promisesaplus.com/assets/logo-small.png" alt="Promises/A+ logo"
         title="Promises/A+ 1.0 compliant" align="right" />
</a>


Fully Standards compliant (At least passes all tests): https://promisesaplus.com/


And implements a extra facility called Pact.any() which will return first non errored promise, unless all errored in the iterator. These are not well tested though. Pact.all(), Pact.race(), Pact.resolve(x), Pact.reject(e) work according to ECMA spec. 
