const Pact = require("./fast-pact.js")

const adapter = {
    resolved: (value) => Pact.resolve(value),
    rejected: (reason) => Pact.reject(reason),
    deferred: () => {
        let resolve = null;
        let reject = null;
        const promise = new Pact((resolveFn, rejectFn) => {
            resolve = resolveFn;
            reject = rejectFn;
        });
        return {
            resolve,
            reject,
            promise
        }
    }
}
var resolved = adapter.resolved;
var deferred = adapter.deferred;
var rejected = adapter.rejected;


var dummy = { dummy: "dummy" }; // we fulfill or reject with this when we don't intend to test against it
var sentinel = { sentinel: "sentinel" }; // a sentinel fulfillment value to test for with strict equality
var other = { other: "other" }; // a value we don't want to be strict equal to

function specify(msg, run_test) {
    run_test(() => {})
}

function describe(msg, cb) {
    console.log(msg)
    cb()
}


function testPromiseResolution(xFactory, test) {
    specify("via return from a fulfilled promise", function (done) {
        var promise = resolved(dummy).then(function onBasePromiseFulfilled() {
            return xFactory();
        });

        test(promise, done);
    });

    specify("via return from a rejected promise", function (done) {
        var promise = rejected(dummy).then(null, function onBasePromiseRejected() {
            return xFactory();
        });

        test(promise, done);
    });
}

function testCallingResolvePromise(yFactory, stringRepresentation, test) {
    describe("`y` is " + stringRepresentation, function () {
        describe("`then` calls `resolvePromise` synchronously", function () {
            function xFactory() {
                return {
                    then: function (resolvePromise) {
                        resolvePromise(yFactory());
                    }
                };
            }

            testPromiseResolution(xFactory, test);
        });

        describe("`then` calls `resolvePromise` asynchronously", function () {
            function xFactory() {
                return {
                    then: function (resolvePromise) {
                        setTimeout(function () {
                            resolvePromise(yFactory());
                        }, 0);
                    }
                };
            }

            testPromiseResolution(xFactory, test);
        });
    });
}

function testCallingResolvePromiseFulfillsWith(yFactory, stringRepresentation, fulfillmentValue) {
    testCallingResolvePromise(yFactory, stringRepresentation, function (promise, done) {
        promise.then(function onPromiseFulfilled(value) {
            console.log(vale, fulfillmentValue)
            console.log("Done")
        });
    });
}

function testCallingResolvePromiseRejectsWith(yFactory, stringRepresentation, rejectionReason) {
    testCallingResolvePromise(yFactory, stringRepresentation, function (promise, done) {
        promise.then(null, function onPromiseRejected(reason) {
            console.log(reason, rejectionReason)
            console.log("Done")
        });
    });
}

// describe("2.3.1: If `promise` and `x` refer to the same object, reject `promise` with a `TypeError' as the reason.",
//          function () {
//     specify("via return from a fulfilled promise", function (done) {
//         var promise = resolved(dummy).then(function () {
//             return promise;
//         });

//         promise.then((result) => {
//             console.log(result)
//         }, function (reason) {
//             console.log(reason)
//             console.log("Done")
//         });
//     });

//     specify("via return from a rejected promise", function (done) {
//         var promise = rejected(dummy).then(null, function () {
//             return promise;
//         });

//         promise.then((result) => {
//             console.log(result)
//         }, function (reason) {
//             console.log(reason)
//             console.log("Done")
//         });
//     });
// });


const promisesAplusTests = require("promises-aplus-tests");

promisesAplusTests(adapter, function (err) {
    console.log("Done");
    // All done; output is in the console. Or check `err` for number of failures.
});
