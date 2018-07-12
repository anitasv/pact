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

var dummy = { dummy: "dummy" }; // we fulfill or reject with this when we don't intend to test against it
var sentinel = { sentinel: "sentinel" }; // a sentinel fulfillment value to test for with strict equality

const promisesAplusTests = require("promises-aplus-tests");

promisesAplusTests(adapter, function (err) {
    // All done; output is in the console. Or check `err` for number of failures.
});

