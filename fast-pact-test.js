const Pact = require("./fast-pact.js")

const adapter = {
    resolved: (value) => Pact.resolve(value),
    rejected: (reason) => Pact.reject(reason),
    deferred: () => {
        const promise = new Pact()
        return {
            resolve: (result) => promise.setResolve(result),
            reject: (err) => promise.setErr(err),
            promise: promise
        }
    }
}
var resolved = adapter.resolved;
var deferred = adapter.deferred;
var rejected = adapter.rejected;


var dummy = { dummy: "dummy" }; // we fulfill or reject with this when we don't intend to test against it
var sentinel = { sentinel: "sentinel" }; // a sentinel fulfillment value to test for with strict equality

// const p = deferred()
// p.promise.then((result) => {
//     console.log(result)
// }, (err) => {
//     console.log(err)
// })
// p.resolve(5)

// var d = null;

// function xFactory() {
//     d = deferred();
//     setTimeout(function () {
//         d.resolve(sentinel);
//     }, 50);
//     return d.promise;
// }

// function specify(msg, run_test) {
//     run_test(() => {})
// }

// function xFactory() {
//     return Object.create(null, {
//         then: {
//             get: function () {
//                 console.log("Then get")
//                 return function thenMethodForX(onFulfilled) {
//                     onFulfilled();
//                 };
//             }
//         }
//     });
// }


// var promise = resolved(dummy).then(function onBasePromiseFulfilled() {
//     return xFactory();
// });

// promise.then(function () {
//     console.log("CB called")
// });



const promisesAplusTests = require("promises-aplus-tests");

promisesAplusTests(adapter, function (err) {
    // All done; output is in the console. Or check `err` for number of failures.
});

